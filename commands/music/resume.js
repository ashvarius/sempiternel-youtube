/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   resume.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/06/25 18:43:54 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/25 18:56:39 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'resume',
	aliases: [],
	description: 'Resume the music.',
	privateMessage: false,
	message: (message, object) => {
		if (!(message.client.music && message.client.music[message.guild.id])) {
			utils.sendMessage(message.channel, object.dictionary, 'error_resume_no_data');
			return;
		}
		const dispatcher = message.guild.me.voice.connection.dispatcher;
		if (!dispatcher.paused) {
			utils.sendMessage(message.channel, object.dictionary, 'error_resume_already');
			return;
		}
		dispatcher.resume();
		utils.sendMessage(message.channel, object.dictionary, 'resume_success');
	}
};