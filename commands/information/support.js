/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   support.js                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/06/09 18:14:19 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/10 18:29:22 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require(`../../utils.js`);

module.exports = {
	name: 'support',
	aliases: [],
	description: 'Get the support server.',
	privateMessage: true,
	message: async (message, object) => {
		const guild = message.client.guilds.cache.get(message.client._config.support);
		if (!guild) {
			utils.sendMessage(message.channel, object.dictionary, 'error_support_not_found');
			return;
		}
		for (const channel of guild.channels.cache.values())
			if (channel.type == 'text'
				&& channel.permissionsFor(guild.me).has('CREATE_INSTANT_INVITE')) {
				const invite = await channel.createInvite({
					temporary: false,
					maxAge: 24 * 60 * 60,
					maxUses: 1,
					unique: true,
					reason: 'Unban'
				});
				utils.sendMessage(message.channel, object.dictionary, 'support_success', {
					'<invite>': invite.url
				});
				return;
			}
		utils.sendMessage(message.channel, object.dictionary, 'error_support_no_invite');
	}
};