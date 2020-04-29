/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   user.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/22 08:52:41 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/27 13:06:21 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const MessageEmbed = require('discord.js').MessageEmbed;
const utils = require('../../utils.js');

module.exports = {
	name: 'user',
	aliases: ['member'],
	description: 'See information about someone.',
	message: async message => {
		const users = Array.from(message.mentions.users.values());
		if (!users.length)
			users.push(message.author);
		for (const user of users) {
			const embed = new MessageEmbed();
			embed.setTitle(user.tag);
			embed.setThumbnail(user.displayAvatarURL({
				dynamic: true,
				size: 4096
			}));
			embed.addField('Id', user.id);
			embed.addField('Bot', user.bot);
			embed.addField('Username', user.username, true);
			embed.addField('Discriminator', user.discriminator, true);
			embed.addField('CreatedAt', user.createdAt.toGMTString());
			const userFlags = user.flags.toArray();
			if (userFlags.length) {
				embed.addField('\u200B', '\u200B');
				embed.addField('UserFlags', `\`${userFlags.join('`,\n`')}\``);
			}
			let member;
			if (message.channel.type != 'dm')
				member = message.guild.members.cache.get(user.id);
			if (member) {
				embed.addField('\u200B', '\u200B');
				embed.addField('DisplayName', member.displayName);
				embed.addField('DisplayHexColor', member.displayHexColor);
				embed.addField('JoinedAt', member.joinedAt.toGMTString());
				if (member.premiumSince)
					embed.addField('PremiumSince', member.premiumSince.toGMTString());
			}
			utils.sendEmbed(message.channel, message.dictionary, embed);
		}
	}
};