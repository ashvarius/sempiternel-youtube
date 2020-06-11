/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   avatar.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/22 07:25:53 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/10 18:45:15 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'avatar',
	aliases: ['pp'],
	description: 'See the avatar on someone.',
	privateMessage: true,
	message: async (message, object) => {
		const users = [];
		for (const arg of object.args) {
			const user = await message.client.users.fetch(arg, false).catch(() => { });
			if (!user) {
				utils.sendMessage(message.channel, object.dictionary, 'error_avatar_user_not_found', {
					'<user>': arg
				});
				continue;
			}
			users.push(user);
		}
		if (!users.length) {
			if (object.args.length)
				return;
			users.push(message.author);
		}
		for (const user of users) {
			const link = user.displayAvatarURL({
				dynamic: true,
				size: 4096
			});
			utils.sendEmbed(message.channel, object.dictionary, utils.getEmbed(object.dictionary, 'avatar_success', {
				'<link>': link
			}).setImage(link));
		}
	}
};