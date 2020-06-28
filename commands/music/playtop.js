/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   playtop.js                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/06/27 23:31:30 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/27 23:31:31 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'playtop',
	aliases: ['pt'],
	description: 'Put the music at the top of the playlist.',
	privateMessage: false,
	message: async (message, object) => {
		if (!object.args.length) {
			utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
				format: `${object.prefix}playtop <url>`
			});
			return;
		}
		let play;
		if (message.client._commands.music)
			play = message.client._commands.music.find(item => item.play).play;
		if (!play) {
			utils.sendMessage(message.channel, object.dictionary, 'error_playtop_no_play');
			return;
		}
		play(message.member, message.client, message.channel, message.guild, object.dictionary, object.args[0], 0);
	}
};