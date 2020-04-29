/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   level.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/28 23:20:11 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/29 02:00:31 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const MessageEmbed = require('discord.js').MessageEmbed;
const utils = require('../../utils.js');

const getDictionary = (guild) => {
	const path = `guilds/${guild.id}.json`;
	const object = utils.readFile(path);
	if (!object.dictionary)
		object.dictionary = guild.client._config.dictionary;
	const dictionary = guild.client._dictionaries[object.dictionary];
	if (object.customDictionary) {
		for (const key of Object.keys(object.customDictionary))
			dictionary[key] = object.customDictionary[key];
		object.dictionary += ' (custom)';
	}
	return dictionary;
};

module.exports = {
	name: 'level',
	aliases: ['rank'],
	description: 'Get information about the level.',
	privateMessage: false,
	message: message => {
		if (!message.args.length) {
			utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
				'<format>': `${message.prefix}level <option>`
			});
			return;
		}
		const option = message.args[0].toLowerCase();
		if (!['me', 'top'].includes(option)) {
			let options = '';
			for (const option of ['me', 'top']) {
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
		const path = `levels/${message.guild.id}.json`;
		const level = utils.readFile(path);
		if (option == 'me') {
			const users = Array.from(message.mentions.users.values());
			if (!users.length)
				users.push(message.author);
			for (const user of users) {
				if (!level[user.id]) {
					utils.sendMessage(message.channel, message.dictionary, 'error_level_user_not_found', {
						'<user>': user
					});
					return;
				}
				const levelConfig = message.client._config.level;
				const maxExperience = level[user.id].level * levelConfig.multiply + levelConfig.minimum;
				let maxBar = 30;
				let rate = maxBar * level[user.id].experience / maxExperience;
				let bar = '';
				while (maxBar--)
					if (rate-- > 0)
						bar += '▣';
					else
						bar += '▢';
				utils.sendMessage(message.channel, message.dictionary, 'level_me', {
					'<user>': user,
					'<level>': level[user.id].level,
					'<experience>': level[user.id].experience,
					'<maxExperience>': maxExperience,
					'<bar>': bar
				});
			}
		} else if (option == 'top') {
			const orderLevel = {};
			let current;
			let length = 20;
			while (length--) {
				for (const id of Object.keys(level))
					if (!orderLevel[id]
						&& (!current
							|| level[id].level > level[current].level
							|| (level[id].level == level[current].level
								&& level[id].experience > level[current].experience)))
						current = id;
				if (!current)
					continue;
				orderLevel[current] = level[current];
				current = null;
			}
			const messages = [utils.getMessage(message.dictionary, 'level_top')];
			let position = 1;
			for (const id of Object.keys(orderLevel)) {
				const member = message.guild.members.cache.get(id);
				if (member)
					messages.push(utils.getMessage(message.dictionary, 'level_top_user', {
						'<position>': position++,
						'<user>': member.user,
						'<level>': orderLevel[id].level
					}));
			}
			for (const ouputMessage of utils.remakeList(messages))
				utils.sendEmbed(message.channel, message.dictionary, new MessageEmbed().setDescription(ouputMessage));
		}
	},
	message_offline: message => {
		if (message.author.bot || message.channel.type == 'dm')
			return;
		const path = `levels/${message.guild.id}.json`;
		const level = utils.readFile(path);
		if (!level[message.author.id])
			level[message.author.id] = {
				level: 0,
				experience: 0
			};
		const levelConfig = message.client._config.level;
		level[message.author.id].experience += message.content.length;
		let maxExperience;
		let up = 0;
		while (level[message.author.id].experience >= (maxExperience = level[message.author.id].level * levelConfig.multiply + levelConfig.minimum)) {
			level[message.author.id].experience -= maxExperience;
			level[message.author.id].level++;
			up++;
		}
		if (up) {
			const dictionary = getDictionary(message.guild);
			utils.sendMessage(message.channel, dictionary, 'level_up', {
				'<name>': message.member.displayName,
				'<up>': up,
				'<level>': level[message.author.id].level
			});
		}
		utils.savFile(path, level);
	}
};