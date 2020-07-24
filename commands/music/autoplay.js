/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   autoplay.js                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/06/15 19:03:13 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/15 19:32:34 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'autoplay',
	aliases: ['ap'],
	description: 'Play music automatically.',
	privateMessage: false,
	message: (message, object) => {
		if (!(message.client.music && message.client.music[message.guild.id])) {
			utils.sendMessage(message.channel, object.dictionary, 'error_autoplay_no_data');
			return;
		}
		if (!(message.guild.me.voice.channelID
			&& message.member.voice.channelID == message.guild.me.voice.channelID)) {
			utils.sendMessage(message.channel, object.dictionary, 'error_autoplay_not_same_voice');
			return;
		}
		const bool = !message.client.music[message.guild.id].autoplay;
		message.client.music[message.guild.id].autoplay = bool;
		if (bool)
			utils.sendMessage(message.channel, object.dictionary, 'autoplay_activate');
		else
			utils.sendMessage(message.channel, object.dictionary, 'autoplay_desactivate');
	}
};