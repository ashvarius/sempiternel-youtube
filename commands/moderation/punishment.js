/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   punishment.js                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/05/29 03:15:35 by ahallain          #+#    #+#             */
/*   Updated: 2020/05/29 03:43:43 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
	name: 'punishment',
	aliases: [],
	description: 'See all the punishments inflicted on someone.',
	privateMessage: false,
	message: async (message, object) => {
		if (!object.args.length) {
			utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
				'<format>': `${object.prefix}punishment <userId>`
			});
			return;
		}
		const path = `members/${object.args[0]}.json`;
		const loadedMember = utils.readFile(path);
		if (!(loadedMember.punishments
			&& loadedMember.punishments[message.guild.id]
			&& loadedMember.punishments[message.guild.id].logs)) {
			utils.sendMessage(message.channel, object.dictionary, 'error_punishment_no_data');
			return;
		}
		let logs = '';
		for (const log of Object.keys(loadedMember.punishments[message.guild.id].logs)) {
			if (logs.length)
				logs += '\n\n';
			logs += `**${new Date(parseInt(log))}**:\n\`${loadedMember.punishments[message.guild.id].logs[log]}\``;
		}
		utils.sendMessage(message.channel, object.dictionary, 'punishment_success', {
			'<logs>': logs
		});
	}
}