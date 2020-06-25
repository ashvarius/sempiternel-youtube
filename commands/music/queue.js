/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   queue.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/06/15 18:03:46 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/15 19:22:10 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'queue',
	aliases: ['q'],
	description: 'View the current music queue.',
	privateMessage: false,
	message: (message, object) => {
		if (!(message.client.music && message.client.music[message.guild.id])) {
			utils.sendMessage(message.channel, object.dictionary, 'error_queue_no_data');
			return;
		}
		let count = 0;
		let queue = '';
		for (const music of message.client.music[message.guild.id].playlist) {
			if (queue.length)
				queue += '\n';
			let request = music.request;
			if (typeof request == 'object') {
				const member = message.guild.members.cache.get(music.request.id);
				if (member)
					request = member.displayName;
				else
					request = user.username;
			}
			let index = count++;
			if (!index)
				index = 'Current';
			queue += utils.getMessage(object.dictionary, 'queue_item', {
				index,
				title: music.title,
				url: music.url,
				user: request
			});
		}
		utils.sendMessage(message.channel, object.dictionary, 'queue_success', {
			queue
		});
	}
};