/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   roulette.js                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 18:45:35 by ahallain          #+#    #+#             */
/*   Updated: 2020/07/04 13:34:46 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'roulette',
	aliases: [],
	description: 'Find out who matches the message entered.',
	privateMessage: false,
	message: (message, object) => {
		if (!object.args.length) {
			utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
				format: `${object.prefix}roulette <message...>`
			});
			return;
		}
		let inputMessage = '';
		for (const word of object.args) {
			if (inputMessage.length)
				inputMessage += ' ';
			inputMessage += word;
		}
		const members = Array.from(message.guild.members.cache.keys());
		const score = utils.getUserScore(message.author) % members.length + utils.getStringScore(inputMessage);
		utils.sendEmbed(message.channel, object.dictionary, utils.getCustomEmbed(message.guild.members.cache.get(members[score % members.length])));
	}
};