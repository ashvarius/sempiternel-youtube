/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ping.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/20 11:09:52 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/20 11:09:53 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'ping',
	aliases: [],
	description: 'Get the average ping of all WebSocketShards.',
	message: message => {
		utils.sendMessage(message.channel, message.dictionary, 'ping_success', {
			'<ping>': message.client.ws.ping
		});
	}
};