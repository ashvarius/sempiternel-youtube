/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   love.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 17:32:55 by ahallain          #+#    #+#             */
/*   Updated: 2020/07/04 13:34:05 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'love',
	aliases: [],
	description: 'Answer a question.',
	privateMessage: true,
	message: (message, object) => {
		const users = Array.from(message.mentions.users.values());
		if (!users.length) {
			utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
				format: `${object.prefix}love <user1> [user2]`
			});
			return;
		}
		if (users.length == 1)
			users.push(message.author);
		if (users.length != 2) {
			utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
				format: `${object.prefix}love <user> <user>`
			});
			return;
		}
		const percent = (utils.getUserScore(users[0]) + utils.getUserScore(users[1])) % 101;
		let maxBar = 30;
		let rate = maxBar * percent / 100;
		let bar = '';
		while (maxBar--)
			if (rate-- > 0)
				bar += '▣';
			else
				bar += '▢';
		utils.sendMessage(message.channel, object.dictionary, 'love_success', {
			user1: users[0],
			user2: users[1],
			percent,
			bar
		});
	}
};