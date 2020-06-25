/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   snipe.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 04:40:11 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/11 20:36:49 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');
const MessageEmbed = require('discord.js').MessageEmbed;
const deleted = {};

module.exports = {
	name: 'snipe',
	aliases: '',
	description: 'Get the last deleted message in the current channel.',
	privateMessage: false,
	message: (message, object) => {
		const deletedObject = deleted[message.channel.id];
		if (!deletedObject) {
			utils.sendMessage(message.channel, object.dictionary, 'error_snipe_nothing');
			return;
		}
		utils.sendEmbed(message.channel, object.dictionary, new MessageEmbed()
			.setAuthor(deletedObject.author.name, deletedObject.author.avatar)
			.setDescription(deletedObject.content));
	},
	messageDelete: async message => {
		if (message.author.bot
			|| !message.member)
			return;
		deleted[message.channel.id] = {
			author: {
				name: message.member.displayName,
				avatar: message.author.displayAvatarURL({
					dynamic: true,
					size: 4096
				})
			},
			content: message.content
		};
	}
};