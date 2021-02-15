const { Client, Constants, VoiceState, MessageEmbed } = require('discord.js');
const EventEmitter = require('events');
const fs = require('fs');
const admin = require('firebase-admin');
const Utils = require('./utils.js');
const default_config = require('./config.json');

const updateOptions = (client, options = []) => {
	const new_options = [];
	for (const option of options) {
		option.description = client.utils.getMessage(client.config.language, option.description);
		if (option.options)
			option.options = updateOptions(client, option.options);
		new_options.push(option);
	}
	return (new_options);
};

let dispatcher;

class DiscordBot extends EventEmitter {
	constructor(logger, config = {}, options = {}) {
		super();
		config = Object.assign({
			color: '#000000',
			disable: []
		}, default_config, config);
		const commands = {};
		if (fs.existsSync('commands'))
			for (const folder of fs.readdirSync('commands')) {
				commands[folder] = {};
				for (const file of fs.readdirSync(`commands/${folder}`)) {
					const command = require(`./commands/${folder}/${file}`);
					commands[folder][command.name] = command;
				}
			}
		dispatcher = async (event, var1, var2) => {
			try {
				for (const var3 of [var1, var2]) {
					if (var3 && var3.partial)
						await var3.fetch();
					if (var3 instanceof VoiceState)
						await var3.guild.members.fetch({
							user: var3.id,
							cache: true,
							force: false
						});
				}
			} catch {
				return;
			}
			for (const category of Object.keys(commands))
				for (const command of Object.values(commands[category]))
					if (typeof command[event] == 'function')
						try {
							await command[event](var1, var2);
						} catch (error) {
							logger.log('error', error);
						}
		};
		this.firebase = admin.initializeApp({
			credential: admin.credential.cert(config['firebase-credential'])
		});
		const client = this.client = new Client(Object.assign({
			messageCacheLifetime: 60 * 60,
			messageSweepInterval: 10 * 60,
			fetchAllMembers: false,
			partials: [
				'USER',
				'CHANNEL',
				'GUILD_MEMBER',
				'MESSAGE',
				'REACTION'
			],
			presence: {
				status: 'idle',
				activity: {
					name: 'logging',
					type: 'WATCHING'
				}
			}
		}, options));
		client.logger = logger;
		client.config = config;
		client.commands = commands;
		client.on('debug', m => logger.log('debug', m));
		client.on('warn', m => logger.log('warn', m));
		client.on('error', m => logger.log('error', m));
		client.on('shardError', m => logger.log('error', m));
		client.on('ready', async () => {
			if (client.utils == null) {
				setTimeout(() => client.emit('ready'), 100);
				return;
			}
			Object.assign(client.config, await client.utils.readFile(client.utils.docRef));
			if (client.config.presence == null)
				client.config.presence = {
					activity: {
						name: 'his program',
						type: 'LISTENING'
					}
				};
			client.config.presence.status = 'online';
			const commands_registered = await client.api.applications(client.user.id).commands.get();
			for (const category of Object.keys(commands))
				for (let command of Object.values(commands[category]))
					if (!client.config.disable.includes(command.name)) {
						command = JSON.parse(JSON.stringify(command));
						command.description = client.utils.getMessage(client.config.language, command.description);
						if (command.options)
							command.options = updateOptions(client, command.options);
						let command_registered = commands_registered.find(item => item.name == command.name);
						if (command_registered != null)
							if (command_registered.description != command.description
								|| JSON.stringify(command_registered.options) != JSON.stringify(command.options)) {
								logger.log('info', `Deleting command ${command.name}...`);
								await client.api.applications(client.user.id).commands(command_registered.id).delete();
								command_registered = null;
							}
						if (command_registered == null) {
							logger.log('info', `Creating command ${command.name}...`);
							await client.api.applications(client.user.id).commands.post({
								data: {
									name: command.name,
									description: command.description,
									options: command.options
								}
							});
						}
						commands_registered.splice(commands_registered.indexOf(command_registered), 1);
					}
			for (const command_registered of commands_registered) {
				logger.log('info', `Deleting command ${command_registered.name}...`);
				client.api.applications(client.user.id).commands(command_registered.id).delete();
			}
			await dispatcher('ready', client);
			this.client.options.presence = this.client.config.presence;
			await this.client.user.setPresence(this.client.options.presence);
			logger.log('info', `${client.user.username} is ready`);
			this.emit('ready');
		});
		const command = (object = {}) => {
			// eslint-disable-next-line no-async-promise-executor
			return new Promise(async resolve => {
				for (const category of Object.keys(commands))
					for (const instance of Object.values(commands[category]))
						if (!client.config.disable.includes(instance.name))
							if (instance.protect && await instance.protect(object.channel)) {
								resolve();
								return;
							}
				for (const category of Object.keys(commands))
					for (const instance of Object.values(commands[category]))
						if (!client.config.disable.includes(instance.name))
							if (instance.name == object.name) {
								if (object.channel.type == 'dm' && !instance.private)
									resolve(client.utils.getMessage(object.channel, 'error_private_disable'));
								else if (!client.config.owners.includes(object.user.id)
									&& instance.permission && !instance.permission(object))
									resolve(client.utils.getMessage(object.channel, 'error_no_access'));
								else
									try {
										resolve(await instance.command(object));
									} catch (error) {
										logger.log('error', error);
										resolve(client.utils.getMessage(object.channel, 'error', { error }));
									}
								return;
							}
			});
		};
		client.on('exit', async (code = 0) => {
			if (this.exit) {
				this.emit('exit', code);
				return;
			}
			await this.destroy();
			if (code)
				this.login();
		});

		client.ws.on('INTERACTION_CREATE', async interaction => {
			if (interaction.type != 2)
				return;
			if (interaction.data.options == null)
				interaction.data.options = [];
			const object = {
				name: interaction.data.name,
				options: interaction.data.options,
				prefix: '/',
				client,
			};
			let guild;
			if (interaction.guild_id != null)
				guild = await client.guilds.fetch(interaction.guild_id);
			let member;
			if (guild && interaction.member != null)
				member = await guild.members.fetch(interaction.member.user.id);
			let user;
			if (interaction.user != null)
				user = await client.users.fetch(interaction.user.id);
			else if (member)
				user = member.user;
			let channel;
			if (interaction.channel_id)
				channel = await client.channels.fetch(interaction.channel_id);
			Object.assign(object, {
				guild,
				member,
				user,
				channel
			});
			const message = await command(object);
			let data;
			if (message == null)
				data = {
					type: 2
				};
			else {
				let embed;
				if (message instanceof MessageEmbed)
					embed = message;
				else
					embed = client.utils.createEmbed(message);
				data = {
					type: 4,
					data: {
						embeds: [embed]
					}
				};
			}
			client.api.interactions(interaction.id, interaction.token).callback.post({ data });
		});
		const register = Object.keys(client._events);
		for (const event of Object.values(Constants.Events))
			if (!register.includes(event))
				client.on(event, (var1, var2) => {
					dispatcher(event, var1, var2);
				});
	}
	login(token) {
		if (token)
			this.token = token;
		if (this.client.ws.destroyed) {
			this.client.ws.destroyed = false;
			this.client.ws.status = Constants.Status.IDLE;
		}
		return new Promise((executor, reject) => {
			this.client.login(this.client.config.token).then(async token => {
				this.client.utils = new Utils(this.client, this.firebase.firestore());
				this.client.user.setPresence({
					status: 'idle',
					activity: {
						name: 'loading',
						type: 'WATCHING'
					}
				});
				this.client.logger.log('info', `${this.client.user.username} is logged`);
				executor(token, this.client);
			}).catch(error => reject(error));
		});
	}
	async destroy() {
		if (dispatcher)
			await dispatcher('destroy', this.client);
		this.client.destroy();
		if (this.client.user)
			this.client.logger.log('info', `${this.client.user.username} is destroy`);
	}
}

module.exports = DiscordBot;