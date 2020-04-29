/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   prefix.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/20 11:10:04 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/21 19:37:56 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'prefix',
	aliases: [],
	description: 'Get the prefix or change it.',
	privateMessage: true,
	message: message => {
		if (message.args.length) {
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
			let prefix = '';
			for (const arg of message.args) {
				if (prefix.length)
					prefix += ' ';
				prefix += arg;
			}
			if (prefix == 'reset')
				delete object.prefix;
			else
				object.prefix = prefix;
			utils.savFile(path, object);
			if (object.prefix)
				utils.sendMessage(message.channel, message.dictionary, 'prefix_changed', {
					'<prefix>': object.prefix
				});
			else
				utils.sendMessage(message.channel, message.dictionary, 'prefix_reset');
		} else if (message.prefix.length)
			utils.sendMessage(message.channel, message.dictionary, 'prefix_display', {
				'<prefix>': message.prefix
			});
		else
			utils.sendMessage(message.channel, message.dictionary, 'error_prefix_nothing');
	}
};