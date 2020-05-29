/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ping.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/20 11:09:52 by ahallain          #+#    #+#             */
/*   Updated: 2020/05/24 15:39:01 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'ping',
	aliases: [],
	description: 'Get the average ping of all WebSocketShards.',
	message: (message, object) => {
		utils.sendMessage(message.channel, object.dictionary, 'ping_success', {
			'<ping>': message.client.ws.ping
		});
	}
};