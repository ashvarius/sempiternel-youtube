/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   choose.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 17:32:55 by ahallain          #+#    #+#             */
/*   Updated: 2020/05/24 15:38:11 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const MessageEmbed = require('discord.js').MessageEmbed;
const utils = require('../../utils.js');

module.exports = {
	name: 'choose',
	aliases: [],
	description: 'Choose between a few arguments.',
	privateMessage: true,
	message: (message, object) => {
		if (!object.args.length) {
			utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
				'<format>': `${message.prefix}chose <question...>`
			});
			return;
		}
		const args = object.args.join(' ').split(',').map(item => item.trim());
		if (args.length < 2) {
			utils.sendMessage(message.channel, message.dictionary, 'error_chose_less');
			return;
		}
		utils.sendEmbed(message.channel, message.dictionary, new MessageEmbed().setDescription(args[Math.floor(Math.random() * args.length)]));
	}
};