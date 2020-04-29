/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   avatar.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/22 07:25:53 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/22 10:50:18 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'avatar',
	aliases: ['pp'],
	description: 'See the avatar on someone.',
	message: message => {
		const users = Array.from(message.mentions.users.values());
		if (!users.length)
			users.push(message.author);
		for (const user of users) {
			const link = user.displayAvatarURL({
				dynamic: true,
				size: 4096
			});
			utils.sendEmbed(message.channel, message.dictionary, utils.getEmbed(message.dictionary, 'avatar_link', {
				'<link>': link
			}).setImage(link));
		}
	}
};