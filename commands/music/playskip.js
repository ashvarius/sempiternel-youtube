/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   playskip.js                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/06/27 23:31:36 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/27 23:33:16 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'playskip',
	aliases: ['ps'],
	description: 'Change the current music to another.',
	privateMessage: false,
	message: async (message, object) => {
		if (!object.args.length) {
			utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
				format: `${object.prefix}playskip <url>`
			});
			return;
		}
		let play;
		if (message.client._commands.music)
			play = message.client._commands.music.find(item => item.play).play;
		if (!play) {
			utils.sendMessage(message.channel, object.dictionary, 'error_playskip_no_play');
			return;
		}
		play(message.member, message.client, message.channel, message.guild, object.dictionary, object.args[0], -1);
	}
};