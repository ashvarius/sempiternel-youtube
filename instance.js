const { Client, Constants, VoiceState } = require('discord.js');
const EventEmitter = require('events');
const fs = require('fs');
const Utils = require('./utils.js');
const default_config = require('./config.json');

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
					if (var3 instanceof VoiceState) {
						if (!var3.channel)
							return;
						await var3.guild.members.fetch({
							user: var3.id,
							cache: true,
							force: false
						});
					}
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
		client.on('ready', () => {
			if (!client.utils) {
				setTimeout(() => client.emit('ready'), 100);
				return;
			}
			dispatcher('ready', client);
			this.client.user.setPresence(this.client.config.presence);
			logger.log('info', `${client.user.username} is ready`);
			this.emit('ready');
		});
		client.on('message', async message => {
			if (message.channel.type == 'text'
				&& !message.channel.permissionsFor(client.user).has('SEND_MESSAGES'))
				return;
			await dispatcher('message', message);
			let [command, ...args] = message.content.split(' ').filter(item => item.length);
			if (!command)
				return;
			let prefix;
			if (message.channel.type != 'dm') {
				prefix = message.guild.prefix;
				if (!prefix)
					prefix = config.prefix;
				if (!command.indexOf(prefix))
					command = command.slice(prefix.length);
				else
					return;
			} else
				prefix = '';
			if (!command.length)
				return;
			const cmd = command.toLowerCase();
			const command_object = {
				command,
				args,
				prefix,
				message
			};
			for (const category of Object.keys(commands))
				for (const instance of Object.values(commands[category]))
					if (!client.config.disable.includes(instance.name))
						if ((instance.name == cmd || instance.aliases.includes(cmd))) {
							if (instance.protect && instance.protect(message.channel))
								return;
							if (message.channel.type == 'dm' && !instance.private)
								client.utils.sendMessage(message.channel, 'error_private_disable');
							else if (!client.config.owners.includes(message.author.id)
								&& instance.permission && !instance.permission(message))
								client.utils.sendMessage(message.channel, 'error_no_access');
							else
								try {
									await instance.command(command_object);
								} catch (error) {
									logger.log('error', error);
								}
							return;
						}
			client.utils.sendMessage(message.channel, 'error_no_command', { command });
		});
		client.on('exit', async (code = 0) => {
			if (this.exit) {
				this.emit('exit', code);
				return;
			}
			await this.destroy();
			if (code)
				this.login();
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
			this.client.login(this.client.config.token).then(token => {
				this.client.utils = new Utils(this.client);
				Object.assign(this.client.config, this.client.utils.readFile('config.json'));
				if (!this.client.config.presence)
					this.client.config.presence = {
						activity: {
							name: 'his program',
							type: 'LISTENING'
						}
					};
				this.client.config.presence.status = 'online';
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