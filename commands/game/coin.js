/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   coin.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 17:32:55 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/08 23:50:28 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'coin',
	aliases: [],
	description: 'Coin flipping.',
	privateMessage: true,
	message: (message, object) => {
		if (Math.floor(Math.random() * 2))
			utils.sendMessage(message.channel, object.dictionary, 'coin_head');
		else
			utils.sendMessage(message.channel, object.dictionary, 'coin_tail');
	}
};