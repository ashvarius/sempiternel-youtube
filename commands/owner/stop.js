/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   stop.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/21 05:37:01 by ahallain          #+#    #+#             */
/*   Updated: 2020/07/05 18:35:57 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'stop',
	aliases: ['exit', 'end'],
	description: 'Stop the bot.',
	privateMessage: true,
	message: async (message, object) => {
		if (!message.client._config.owners.includes(message.author.id)) {
			utils.sendMessage(message.channel, object.dictionary, 'error_not_owner');
			return;
		}
		await utils.sendMessage(message.channel, object.dictionary, 'stop_success');
		message.client.emit('exit');
	}
};