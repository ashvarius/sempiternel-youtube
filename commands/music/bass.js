/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   bass.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/06/30 14:34:15 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/30 14:45:17 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'bass',
	aliases: [],
	description: 'Change the bass of the music.',
	privateMessage: false,
	message: async (message, object) => {
		if (!(message.client.music && message.client.music[message.guild.id])) {
			utils.sendMessage(message.channel, object.dictionary, 'error_bass_no_data');
			return;
		}
		if (!(message.guild.me.voice.channelID
			&& message.member.voice.channelID == message.guild.me.voice.channelID)) {
			utils.sendMessage(message.channel, object.dictionary, 'error_bass_not_same_voice');
			return;
		}
		if (!object.args.length) {
			utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
				format: `${object.prefix}bass <number>`
			});
			return;
		}
		if (isNaN(object.args[0])) {
			utils.sendMessage(message.channel, object.dictionary, 'error_isnana', {
				arg: object.args[0]
			});
			return;
		}
		const number = parseFloat(object.args[0]);
		if (number < -20 || number > 20) {
			utils.sendMessage(message.channel, object.dictionary, 'error_bass_not_right_interval', {
				min: -20,
				max: 20
			});
			return;
		}
		let start;
		if (message.client._commands.music)
			start = message.client._commands.music.find(item => item.start).start;
		if (!start) {
			utils.sendMessage(message.channel, dictionary, 'error_bass_no_start');
			return;
		}
		if (!message.client.music[message.guild.id].boost)
			message.client.music[message.guild.id].boost = {};
		message.client.music[message.guild.id].boost.bass = number;
		const current = message.client.music[message.guild.id].current;
		current.time = (current.time ? current.time : 0) + message.client.music[message.guild.id].connection.dispatcher.streamTime;
		await start(message.client, message.guild.id, current);
		utils.sendMessage(message.channel, object.dictionary, 'bass_success', {
			number
		});
	}
};