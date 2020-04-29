/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   clear.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/22 12:16:56 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/26 13:23:22 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');
const pending = [];

module.exports = {
	name: 'clear',
	aliases: ['wipe', 'clean', 'bulk'],
	description: 'Delete messages from a channel.',
	privateMessage: false,
	message: async message => {
		if (pending.includes(message.channel.id)) {
			message.delete();
			return;
		}
		if (!message.channel.permissionsFor(message.member).has('MANAGE_MESSAGES')) {
			utils.sendMessage(message.channel, message.dictionary, 'error_no_permission', {
				'<permission>': 'MANAGE_MESSAGES'
			});
			return;
		}
		if (!message.args.length) {
			utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
				'<format>': `${message.prefix}clear <number>`
			});
			return;
		}
		if (isNaN(message.args[0])) {
			utils.sendMessage(message.channel, message.dictionary, 'error_isnana', {
				'<arg>': message.args[0]
			});
			return;
		}
		const numberMax = parseInt(message.args[0]);
		if (numberMax <= 0) {
			utils.sendMessage(message.channel, message.dictionary, 'error_clear_number_too_small');
			return;
		}
		let bulkLength;
		let deleted = 0;
		let number = numberMax;
		const now = Date.now();
		const index = pending.length;
		pending.push(message.channel.id);
		do {
			const fetched = (await message.channel.messages.fetch({
				limit: number < 100 ? number : 100
			}, false)).filter(message => message.createdTimestamp <= now);
			bulkLength = Array.from((await message.channel.bulkDelete(fetched, true)).values()).length;
			deleted += bulkLength;
			number -= bulkLength;
		}
		while (bulkLength && number);
		pending.splice(index, 1);
		utils.sendMessage(message.channel, message.dictionary, 'clear_success', {
			'<count>': deleted
		});
	}
};