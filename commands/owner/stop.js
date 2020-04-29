/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   stop.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/21 05:37:01 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/25 04:08:36 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');
const config = require('../../config.json');

module.exports = {
	name: 'stop',
	aliases: ['exit', 'end'],
	description: 'Restart the bot.',
	message: async message => {
		if (!config.owners.includes(message.author.id)) {
			utils.sendMessage(message.channel, message.dictionary, 'error_not_owner');
			return;
		}
		await utils.sendMessage(message.channel, message.dictionary, 'stop_success');
		message.client.emit('exit');
	}
};