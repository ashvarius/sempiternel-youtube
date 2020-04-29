/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/20 11:09:34 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/28 15:45:26 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const { Client, Constants } = require('discord.js');
const fs = require('fs');
const config = require('./config.json');
const utils = require('./utils.js');

const client = new Client({
	fetchAllMembers: true,
	presence: config.presence
});
const commands = {};
const dictionaries = {};

client.on('ready', () => {
	if (fs.existsSync('commands'))
		for (const category of fs.readdirSync('commands'))
			for (const filename of fs.readdirSync(`commands/${category}`)) {
				if (!commands[category])
					commands[category] = [];
				commands[category].push(require(`./commands/${category}/${filename}`));
			}
	if (fs.existsSync('dictionaries'))
		for (const dictionary of fs.readdirSync('dictionaries'))
			dictionaries[dictionary.substring(0, dictionary.lastIndexOf('.'))] = require(`./dictionaries/${dictionary}`);
	const events = client.eventNames();
	for (const event of Object.values(Constants.Events))
		if (!events.includes(event))
			client.on(event, (var1, var2) => {
				for (const category of Object.keys(commands))
					for (const command of commands[category])
						if (typeof command[event] == 'function')
							command[event](var1, var2);
			});
	for (const category of Object.keys(commands))
		for (const command of commands[category])
			if (typeof command.ready == 'function')
				command.ready(client);
	for (const guild of client.guilds.cache.values())
		for (const channel of guild.channels.cache.values())
			if (channel.type == 'text' && channel.viewable)
				channel.messages.fetch();
	client._config = config;
	client._commands = commands;
	client._dictionaries = dictionaries;
	console.log(`${client.user.username} is ready!`);
});

client.on('message', message => {
	for (const category of Object.keys(commands))
		for (const command of commands[category])
			if (typeof command.message_offline == 'function')
				command.message_offline(message);
	if (message.author.bot)
		return;
	let object = {};
	if (message.channel.type != 'dm')
		Object.assign(object, utils.readFile(`guilds/${message.guild.id}.json`));
	Object.assign(object, utils.readFile(`members/${message.author.id}.json`));
	if (!object.dictionary)
		object.dictionary = config.dictionary;
	if (!object.prefix)
		object.prefix = config.prefix;
	if (message.channel.type != 'dm'
		&& !message.content.indexOf(message.guild.me.displayName))
		message.content = message.content.replace(message.guild.me.displayName, object.prefix);
	if (!message.content.indexOf(client.user.username))
		message.content = message.content.replace(client.user.username, object.prefix);
	if (message.content.split(' ')[0].includes(client.user.id))
		message.content = message.content.replace(message.content.split(' ')[0], object.prefix);
	if (!message.content.indexOf(object.prefix))
		message.content = message.content.slice(object.prefix.length);
	else if (message.channel.type != 'dm')
		return;
	const dictionary = dictionaries[object.dictionary];
	if (object.customDictionary) {
		for (const key of Object.keys(object.customDictionary))
			dictionary[key] = object.customDictionary[key];
		object.dictionary += ' (custom)';
	}
	if (message.channel.type != 'dm') {
		const permissions = message.channel.permissionsFor(message.guild.me);
		if (!permissions.has('SEND_MESSAGES'))
			return;
		if (!permissions.has('EMBED_LINKS')) {
			message.channel.send(utils.getMessage(dictionary, 'error_no_embed_permission'));
			return;
		};
	}
	let [command, ...args] = message.content.split(' ').filter(item => item.length);
	if (!command)
		return;
	if (command.length > 50) {
		utils.sendMessage(message.channel, dictionary, 'error_command_too_big', {
			'<size>': 50
		});
		return;
	}
	command = command.toLowerCase();
	Object.assign(object, {
		command,
		args,
		language: object.dictionary,
		dictionary
	});
	Object.assign(message, object);
	for (const category of Object.keys(commands))
		for (const command of commands[category]) {
			if (!(command.name == message.command
				|| command.aliases.includes(message.command)))
				continue;
			if (message.channel.type == 'dm'
				&& typeof command.privateMessage == 'boolean'
				&& !command.privateMessage) {
				utils.sendMessage(message.channel, dictionary, 'error_private_message_disable');
				return;
			}
			if (object.authorize) {
				let activate = true;
				if (object.authorize.all) {
					activate = object.authorize.all.disable ? false : true;
					if (typeof object.authorize.all[message.channel.id] == 'boolean')
						activate = object.authorize.all[message.channel.id];
				}
				if (object.authorize[command.name]) {
					activate = object.authorize[command.name].disable ? false : true;
					if (typeof object.authorize[command.name][message.channel.id] == 'boolean')
						activate = object.authorize[command.name][message.channel.id];
				}
				if (!activate)
					return;
			}
			command.message(message);
			return;
		}
	utils.sendMessage(message.channel, dictionary, 'error_command_not_found', {
		'<command>': command,
		'<prefix>': message.prefix
	});
});

client.on('exit', async (code = 0) => {
	for (const category of Object.keys(commands))
		for (const command of commands[category])
			if (typeof command.restart == 'function')
				await command.restart(client);
	client.destroy();
	process.exit(code);
});

client.on('guildDelete', guild => {
	const path = `guilds/${guild.id}.json`;
	if (fs.existsSync(path))
		utils.deleteFile(path);
});

client.on('debug', info => {
	if (config.debug)
		console.log(info);
});

process.on('SIGINT', () => {
	client.emit('exit');
});

process.on('uncaughtException', err => {
	console.error(err);
	client.emit('exit', 1);
});

client.login(config.token);