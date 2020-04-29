/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   authorize.js                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/21 05:36:52 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/28 15:43:53 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const MessageEmbed = require('discord.js').MessageEmbed;
const utils = require('../../utils.js');

module.exports = {
	name: 'authorize',
	aliases: ['permit', 'allow'],
	description: 'Activate or deactivate one or more commands in a specific channel.',
	privateMessage: false,
	message: message => {
		if (!message.args.length) {
			utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
				'<format>': `${message.prefix}authorize <option> ...`
			});
			return;
		}
		const option = message.args[0].toLowerCase();
		if (!['add', 'list', 'reset'].includes(option)) {
			let options = '';
			for (const option of ['add', 'list', 'reset']) {
				if (options.length)
					options += ', ';
				options += `\`${option}\``;
			}
			utils.sendMessage(message.channel, message.dictionary, 'error_invalid_option', {
				'<option>': message.args[0],
				'<options>': options
			});
			return;
		} else if (option == 'list') {
			if (!message.authorize) {
				utils.sendMessage(message.channel, message.dictionary, 'error_authorize_not_defined');
				return;
			}
			const lines = [];
			for (const command of Object.keys(message.authorize)) {
				lines.push(`\n**${command}**:`);
				for (const channelId of Object.keys(message.authorize[command]))
					if (channelId != 'disable') {
						const channel = message.guild.channels.cache.get(channelId);
						if (channel)
							lines.push(`${channel}: \`${message.authorize[command][channelId]}\``);
					}
			}
			const messages = utils.remakeList(lines);
			for (const description of messages) {
				const embed = new MessageEmbed();
				embed.setDescription(description);
				utils.sendEmbed(message.channel, message.dictionary, embed);
			}
			return;
		}
		if (!message.member.hasPermission('ADMINISTRATOR')) {
			utils.sendMessage(message.channel, message.dictionary, 'error_no_permission', {
				'<permission>': 'ADMINISTRATOR'
			});
			return;
		}
		const path = `guilds/${message.guild.id}.json`;
		const object = utils.readFile(path);
		if (option == 'add') {
			if (message.args.length < 3) {
				utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
					'<format>': `${message.prefix}authorize add <command/all> <enable/disable> [channelId]`
				});
				return;
			}
			let commands = {
				all: 'all'
			};
			for (const category of Object.keys(message.client._commands))
				for (const command of message.client._commands[category]) {
					commands[command.name] = command.name;
					for (const aliase of command.aliases)
						commands[aliase] = command.name;
				}
			const command = commands[message.args[1].toLowerCase()];
			if (!command) {
				utils.sendMessage(message.channel, message.dictionary, 'error_authorize_command_not_found', {
					'<command>': message.args[1]
				});
				return;
			}
			const setting = message.args[2].toLowerCase();
			if (!['enable', 'disable'].includes(setting)) {
				let options = '';
				for (const option of ['enable', 'disable']) {
					if (options.length)
						options += ', ';
					options += `\`${option}\``;
				}
				utils.sendMessage(message.channel, message.dictionary, 'error_invalid_option', {
					'<option>': message.args[2],
					'<options>': options
				});
				return;
			}
			let channel;
			if (message.args.length < 4)
				channel = message.channel;
			else {
				channel = message.guild.channels.cache.get(message.args[3]);
				if (!channel) {
					utils.sendMessage(message.channel, message.dictionary, 'error_authorize_channel_not_found', {
						'<id>': message.args[3]
					});
					return;
				}
			}
			if (!object.authorize)
				object.authorize = {};
			if (!object.authorize[command])
				object.authorize[command] = {};
			for (const channelId of Object.keys(object.authorize[command]))
				if (!message.guild.channels.cache.get(channelId))
					delete object.authorize[command][channelId];
			object.authorize[command][channel.id] = setting == 'enable' ? true : false;
			if (object.authorize[command][channel.id])
				object.authorize[command].disable = true;
			else {
				delete object.authorize[command].disable;
				for (const channelId of Object.keys(object.authorize[command]))
					if (object.authorize[command][channelId]) {
						object.authorize[command].disable = true;
						break;
					}
			}
			utils.savFile(path, object);
			utils.sendMessage(message.channel, message.dictionary, 'authorize_add', {
				'<setting>': setting,
				'<command>': command,
				'<channel>': channel
			});
		} else if (option == 'reset') {
			if (!object.authorize) {
				utils.sendMessage(message.channel, message.dictionary, 'error_authorize_not_defined');
				return;
			}
			delete object.authorize;
			utils.savFile(path, object);
			utils.sendMessage(message.channel, message.dictionary, 'authorize_reset');
		}
	}
};