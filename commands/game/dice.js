/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dice.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 17:32:55 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/11 20:36:57 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'dice',
	aliases: [],
	description: 'Roll a die.',
	privateMessage: true,
	message: (message, object) => {
		utils.sendMessage(message.channel, object.dictionary, 'dice_success', {
			number: Math.floor(Math.random() * 6) + 1
		});
	}
};