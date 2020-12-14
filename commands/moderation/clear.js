module.exports = {
	name: 'clear',
	aliases: ['clean'],
	command: async command => {
		if (!command.message.guild.me.hasPermission('MANAGE_MESSAGES')) {
			command.message.client.utils.sendMessage(command.message.channel, 'error_bot_no_permission', {
				permission: 'MANAGE_MESSAGES'
			});
			return;
		}
		let number = command.args.length && !isNaN(command.args[0]) ? parseInt(command.args[0]) : null;
		if (!number || number <= 0) {
			const embed = command.message.client.utils.createEmbed();
			embed.addField(`${command.prefix}${command.command} <number>`, command.message.client.utils.getMessage(command.message.channel, 'clear_help'));
			command.message.client.utils.sendEmbed(command.message.channel, embed);
			return;
		}
		let deleted = 0;
		while (number) {
			const amount = await command.message.channel.bulkDelete(number > 100 ? 100 : number, true)
				.then(messages => Array.from(messages.keys()).length)
				.catch(() => { });
			if (!amount)
				break;
			deleted += amount;
			number -= amount;
		}
		command.message.client.utils.sendMessage(command.message.channel, 'clear_success', { amount: deleted });
	},
	permission: (message) => {
		if (!message.member.hasPermission('MANAGE_MESSAGES'))
			return false;
		return true;
	}
};