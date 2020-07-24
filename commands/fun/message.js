/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   message.js                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/06/09 01:07:25 by ahallain          #+#    #+#             */
/*   Updated: 2020/07/04 13:34:15 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'message',
	aliases: ['msg'],
	description: 'Send a message with the bot.',
	privateMessage: false,
	message: (message, object) => {
		if (!message.guild.me.hasPermission('MANAGE_MESSAGES')) {
			utils.sendMessage(message.channel, object.dictionary, 'error_bot_no_permission', {
				permission: 'MANAGE_MESSAGES'
			});
			return;
		}
		if (!object.args.length) {
			utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
				format: `${object.prefix}message <message...>`
			});
			return;
		}
		message.delete({
			reason: 'Message command executed.'
		});
		let input = '';
		for (const word of object.args) {
			if (input.length)
				input += ' ';
			input += word;
		}
		const embed =  utils.getCustomEmbed(input);
		utils.sendEmbed(message.channel, object.dictionary, embed);
	}
};