/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   rate.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 17:32:55 by ahallain          #+#    #+#             */
/*   Updated: 2020/07/04 13:34:39 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'rate',
	aliases: [],
	description: 'Rate a question.',
	privateMessage: true,
	message: (message, object) => {
		if (!object.args.length) {
			utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
				format: `${object.prefix}rate <question...>`
			});
			return;
		}
		let question = '';
		for (const word of object.args) {
			if (question.length)
				question += ' ';
			question += word;
		}
		const score = utils.getUserScore(message.author) % 100 + utils.getStringScore(question);
		utils.sendEmbed(message.channel, object.dictionary, utils.getCustomEmbed(`${score % 10}/10`));
	}
};