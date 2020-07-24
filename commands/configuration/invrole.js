/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   invrole.js                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/05/08 10:03:49 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/11 20:12:45 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const Permissions = require('discord.js').Permissions;
const utils = require('../../utils.js');

module.exports = {
	name: 'invrole',
	aliases: [],
	description: 'Make an invisible role',
	privateMessage: false,
	message: (message, object) => {
		if (!message.member.hasPermission('MANAGE_ROLES')) {
			utils.sendMessage(message.channel, object.dictionary, 'error_no_permission', {
				permission: 'MANAGE_ROLES'
			});
			return;
		}
		if (!message.guild.me.hasPermission('MANAGE_ROLES')) {
			utils.sendMessage(message.channel, object.dictionary, 'error_bot_no_permission', {
				permission: 'MANAGE_ROLES'
			});
			return;
		}
		let name = '';
		for (const word of object.args) {
			if (name.length)
				name += ' ';
			name += word;
		}
		const max = 30;
		if (name.length > max) {
			utils.sendMessage(message.channel, object.dictionary, 'error_invrole_too_long', {
				name,
				maximum: max
			});
			return;
		}
		while (name.length < max) {
			name += ' ';
			if (name.length < max)
				name = ' ' + name;
		}
		name = '⁣' + name + '⁣';
		message.guild.roles.create({
			data: {
				name: name,
				color: '2f3136',
				permissions: new Permissions()
			},
			reason: 'InvRole Command'
		});
		utils.sendMessage(message.channel, object.dictionary, 'invrole_success', {
			name
		});
	}
};