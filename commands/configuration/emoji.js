module.exports = {
	name: 'emoji',
	aliases: [],
	command: async command => {
		if (!command.message.guild.me.hasPermission('MANAGE_EMOJIS')) {
			command.message.client.utils.sendMessage(command.message.channel, 'error_bot_no_permission', {
				permission: 'MANAGE_EMOJIS'
			});
			return;
		}
		const message = await command.message.client.utils.sendMessage(command.message.channel, 'emoji_await_reaction');
		while (1) {
			const reaction = Array.from((await message.awaitReactions((reaction, user) => {
				if (user.id != command.message.author) {
					if (command.message.channel.permissionsFor(command.message.guild.me).has('MANAGE_MESSAGES'))
						reaction.users.remove(user);
					return false;
				}
				return true;
			}, { time: 60000, max: 1, dispose: true })).values())[0];
			if (!reaction) {
				if (!message.deleted)
					message.delete();
				return;
			}
			const emoji = reaction.emoji;
			if (emoji.url)
				command.message.guild.emojis.create(emoji.url, emoji.name);
			else if (command.message.channel.permissionsFor(command.message.guild.me).has('MANAGE_MESSAGES'))
				reaction.users.remove(command.message.author);
		}
	},
	permission: (message) => {
		if (!message.member.hasPermission('MANAGE_EMOJIS'))
			return false;
		return true;
	}
};