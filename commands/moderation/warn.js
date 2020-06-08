/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   warn.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/23 10:53:54 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/08 20:01:11 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'warn',
	aliases: [],
	description: 'Warn someone.',
	privateMessage: false,
	message: async (message, object) => {
		if (object.args.length < 2) {
			utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
				'<format>': `${object.prefix}warn <userId> <reason>`
			});
			return;
		}
		const member = message.guild.members.cache.get(object.args[0]);
		if (!member) {
			utils.sendMessage(message.channel, object.dictionary, 'error_warn_member_not_found', {
				'<member>': object.args[0]
			});
			return;
		}
		if (member.roles.highest.position >= message.member.roles.highest.position) {
			utils.sendMessage(message.channel, object.dictionary, 'error_warn_highest', {
				'<member>': member
			});
			return;
		}
		const path = `members/${member.id}.json`;
		const loadedMember = utils.readFile(path);
		let reason = '';
		for (let index = 1; index < object.args.length; index++) {
			if (reason.length)
				reason += ' ';
			reason += object.args[index];
		}
		let timestamp = new Date().getTime();
		if (!loadedMember.punishments)
			loadedMember.punishments = {};
		if (!loadedMember.punishments[message.guild.id])
			loadedMember.punishments[message.guild.id] = {};
		if (!loadedMember.punishments[message.guild.id].logs)
			loadedMember.punishments[message.guild.id].logs = {};
		loadedMember.punishments[message.guild.id].logs[timestamp] = reason;
		utils.savFile(path, loadedMember);
		utils.sendMessage(message.channel, object.dictionary, 'warn_success', {
			'<member>': member,
			'<reason>': reason
		});
		utils.sendMessage(await member.createDM(), object.dictionary, 'warn_private', {
			'<reason>': reason,
			'<guild>': member.guild.name
		}).catch(error => utils.sendMessage(message.channel, object.dictionary, 'error_warn_not_send', {
			'<member>': member,
			'<error>': error.message
		}));
	}
};