/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dictionary.js                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/21 05:36:52 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/28 15:41:38 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const MessageEmbed = require('discord.js').MessageEmbed;
const utils = require('../../utils.js');

module.exports = {
	name: 'dictionary',
	aliases: [],
	description: 'View the dictionary, change or modify it.',
	privateMessage: true,
	message: message => {
		if (!message.args.length) {
			utils.sendMessage(message.channel, message.dictionary, 'dictionary_display', {
				'<dictionary>': message.language
			});
			return;
		}
		const option = message.args[0].toLowerCase();
		if (option == 'list') {
			let dictionaries = '';
			for (const dictionary of Object.keys(message.client._dictionaries)) {
				if (dictionaries.length)
					dictionaries += ', ';
				dictionaries += `\`${dictionary}\``;
			}
			utils.sendMessage(message.channel, message.dictionary, 'dictionary_list', {
				'<dictionaries>': dictionaries
			});
			return;
		} else if (option == 'get') {
			const lines = [];
			for (const key of Object.keys(message.dictionary))
				lines.push(`**${key}**:\n\`${message.dictionary[key].replace(new RegExp('`', 'g'), '\'')}\`\n`);
			const messages = utils.remakeList(lines);
			for (const description of messages) {
				const embed = new MessageEmbed();
				embed.setTitle(message.language);
				embed.setDescription(description);
				utils.sendEmbed(message.channel, message.dictionary, embed);
			}
			return;
		} else if (!['set', 'edit', 'reset'].includes(option)) {
			let options = '';
			for (const option of ['list', 'set', 'get', 'edit', 'reset']) {
				if (options.length)
					options += ', ';
				options += `\`${option}\``;
			}
			utils.sendMessage(message.channel, message.dictionary, 'error_invalid_option', {
				'<option>': message.args[0],
				'<options>': options
			});
			return;
		}
		let path;
		if (message.channel.type == 'dm')
			path = `members/${message.author.id}.json`;
		else {
			if (!message.member.hasPermission('ADMINISTRATOR')) {
				utils.sendMessage(message.channel, message.dictionary, 'error_no_permission', {
					'<permission>': 'ADMINISTRATOR'
				});
				return;
			}
			path = `guilds/${message.guild.id}.json`;
		}
		const object = utils.readFile(path);
		if (option == 'set') {
			if (message.args.length < 2) {
				utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
					'<format>': `${message.prefix}dictionary set <language>`
				});
				return;
			}
			const newLanguage = message.args[1].toLowerCase();
			for (const language of Object.keys(message.client._dictionaries))
				if (newLanguage == language.toLowerCase()) {
					object.dictionary = language;
					utils.savFile(path, object);
					utils.sendMessage(message.channel, message.dictionary, 'dictionary_change', {
						'<dictionary>': object.dictionary
					});
					return;
				}
			utils.sendMessage(message.channel, message.dictionary, 'error_dictionary_language_unavailable', {
				'<language>': message.args[1]
			});
		} else if (option == 'edit') {
			if (message.args.length < 3) {
				utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
					'<format>': `${message.prefix}dictionary edit <key> <value>`
				});
				return;
			}
			const key = message.args[1].toLowerCase();
			for (const key1 of Object.keys(message.dictionary))
				if (key == key1.toLowerCase()) {
					if (!object.customDictionary)
						object.customDictionary = {};
					let value = '';
					for (let index = 2; index < message.args.length; index++) {
						if (value.length)
							value += ' ';
						value += message.args[index];
					}
					object.customDictionary[key1] = value;
					utils.savFile(path, object);
					utils.sendMessage(message.channel, message.dictionary, 'dictionary_edit', {
						'<key>': key1,
						'<value>': value
					});
					return;
				}
			utils.sendMessage(message.channel, message.dictionary, 'error_dictionary_key_unavailable', {
				'<key>': message.args[1]
			});
		} else {
			if (!object.customDictionary
				&& !object.dictionary) {
				utils.sendMessage(message.channel, message.dictionary, 'error_dictionary_no_custom');
				return;
			}
			delete object.dictionary;
			delete object.customDictionary;
			utils.savFile(path, object);
			utils.sendMessage(message.channel, message.dictionary, 'dictionary_reset');
		}
	}
};