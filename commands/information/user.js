/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   user.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/22 08:52:41 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/10 21:02:46 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const MessageEmbed = require('discord.js').MessageEmbed;
const utils = require('../../utils.js');

module.exports = {
	name: 'user',
	aliases: ['member'],
	description: 'See information about someone.',
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
			embed.addField('CreatedAt', user.createdAt);
			let flags = user.flags;
			if (flags)
				flags = user.flags.toArray();
			if (flags && flags.length) {
				embed.addField('\u200B', '\u200B');
				embed.addField('Flags', `\`${flags.join('`,\n`')}\``);
			}
			let member;
			if (message.channel.type != 'dm')
				member = message.guild.members.cache.get(user.id);
			if (member) {
				embed.addField('\u200B', '\u200B');
				embed.addField('DisplayName', member.displayName);
				embed.addField('DisplayHexColor', member.displayHexColor);
				embed.addField('JoinedAt', member.joinedAt);
				if (member.premiumSince)
					embed.addField('PremiumSince', member.premiumSince);
			}
			utils.sendEmbed(message.channel, object.dictionary, embed);
		}
	}
};