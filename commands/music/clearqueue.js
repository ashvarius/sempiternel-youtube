/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   clearqueue.js                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/06/15 19:22:56 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/15 19:32:24 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'clearqueue',
	aliases: ['cq'],
	description: 'Clear the current music queue.',
	privateMessage: false,
	message: (message, object) => {
		if (!(message.client.music && message.client.music[message.guild.id])) {
			utils.sendMessage(message.channel, object.dictionary, 'error_clearqueue_no_data');
			return;
		}
		if (!(message.guild.me.voice.channelID
			&& message.member.voice.channelID == message.guild.me.voice.channelID)) {
			utils.sendMessage(message.channel, object.dictionary, 'error_clearqueue_not_same_voice');
			return;
		}
		message.client.music[message.guild.id].playlist.splice(1, message.client.music[message.guild.id].playlist.length - 1);
		utils.sendMessage(message.channel, object.dictionary, 'clearqueue_success');
	}
};