/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   queue.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/06/15 18:03:46 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/27 21:21:31 by ahallain         ###   ########.fr       */
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
		const current = message.client.music[message.guild.id].current;
		let request = current.request;
		if (typeof request == 'object') {
			const member = message.guild.members.cache.get(current.request.id);
			if (member)
				request = member.displayName;
			else
				request = user.username;
		}
		const lines = [
			utils.getMessage(object.dictionary, 'queue_header'),
			utils.getMessage(object.dictionary, 'queue_item', {
				index: 'Current',
				title: current.title,
				url: current.url,
				user: request
			})
		];
		index = 'Current';
		let count = 0;
		for (const music of message.client.music[message.guild.id].playlist) {
			request = music.request;
			if (typeof request == 'object') {
				const member = message.guild.members.cache.get(music.request.id);
				if (member)
					request = member.displayName;
				else
					request = user.username;
			}
			let index = ++count;
			lines.push(utils.getMessage(object.dictionary, 'queue_item', {
				index,
				title: music.title,
				url: music.url,
				user: request
			}));
		}
		const messages = utils.remakeList(lines);
		for (const item of messages)
			utils.sendEmbed(message.channel, object.dictionary, utils.getCustomEmbed(item));
	}
};