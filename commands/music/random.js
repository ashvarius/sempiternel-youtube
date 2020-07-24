/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   random.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/06/27 00:15:06 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/27 04:30:52 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'random',
	aliases: [],
	description: 'Play music at random.',
	privateMessage: false,
	message: (message, object) => {
		if (!(message.client.music && message.client.music[message.guild.id])) {
			utils.sendMessage(message.channel, object.dictionary, 'error_random_no_data');
			return;
		}
		if (!(message.guild.me.voice.channelID
			&& message.member.voice.channelID == message.guild.me.voice.channelID)) {
			utils.sendMessage(message.channel, object.dictionary, 'error_random_not_same_voice');
			return;
		}
		const bool = !message.client.music[message.guild.id].random;
		message.client.music[message.guild.id].random = bool;
		if (bool)
			utils.sendMessage(message.channel, object.dictionary, 'random_activate');
		else
			utils.sendMessage(message.channel, object.dictionary, 'random_desactivate');
	}
};