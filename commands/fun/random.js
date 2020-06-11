/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   random.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 17:32:55 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/08 23:32:07 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'random',
	aliases: [],
	description: 'Get a random number between zero and a number.',
	privateMessage: true,
	message: (message, object) => {
		if (!object.args.length) {
			utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
				'<format>': `${object.prefix}random <number>`
			});
			return;
		}
		if (isNaN(object.args[0])) {
			utils.sendMessage(message.channel, object.dictionary, 'error_isnana', {
				'<arg>': object.args[0]
			});
			return;
		}
		const number = parseInt(object.args[0]);
		if (number <= 0) {
			utils.sendMessage(message.channel, object.dictionary, 'error_random_number_too_small');
			return;
		}
		utils.sendMessage(message.channel, object.dictionary, 'random_success', {
			'<number>': Math.floor(Math.random() * (number + 1))
		});
	}
};