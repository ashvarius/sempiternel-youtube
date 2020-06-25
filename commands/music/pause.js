/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pause.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/06/25 18:43:54 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/25 18:56:36 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'pause',
	aliases: [],
	description: 'Pause music.',
	privateMessage: false,
	message: (message, object) => {
		if (!(message.client.music && message.client.music[message.guild.id])) {
			utils.sendMessage(message.channel, object.dictionary, 'error_pause_no_data');
			return;
		}
		const dispatcher = message.guild.me.voice.connection.dispatcher;
		if (dispatcher.paused) {
			utils.sendMessage(message.channel, object.dictionary, 'error_pause_already');
			return;
		}
		dispatcher.pause();
		utils.sendMessage(message.channel, object.dictionary, 'pause_success');
	}
};