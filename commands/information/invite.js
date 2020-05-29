/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   invite.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/20 11:09:55 by ahallain          #+#    #+#             */
/*   Updated: 2020/05/24 15:38:52 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const url = require('url');
const config = require('../../config.json');
const utils = require('../../utils.js');
const package = require('../../package.json');

module.exports = {
	name: 'invite',
	aliases: [],
	description: 'Get the bot invitation link.',
	message: async (message, object) => {
		let link = await message.client.generateInvite(config.permissions);
		if (package.homepage) {
			const parsed = url.parse(link, true);
			delete parsed.search;
			parsed.query.response_type = 'code';
			parsed.query.redirect_uri = package.homepage;
			link = url.format(parsed);
		}
		utils.sendMessage(message.channel, object.dictionary, 'invite_success', {
			'<invite>': link
		});
	}
};