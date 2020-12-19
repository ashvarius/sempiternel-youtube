module.exports = {
	name: 'emoji',
	aliases: [],
	description: 'description_emoji',
	command: async command => {
		if (!command.message.guild.me.hasPermission('MANAGE_EMOJIS')) {
			command.message.client.utils.sendMessage(command.message.channel, 'error_bot_no_permission', {
				permission: 'MANAGE_EMOJIS'
			});
			return;
		}
		const message = await command.message.client.utils.sendMessage(command.message.channel, 'emoji_await_reaction');
		let reaction;
		do {
			reaction = Array.from((await message.awaitReactions((reaction, user) => {
				if (user.id != command.message.author) {
					if (command.message.channel.permissionsFor(command.message.guild.me).has('MANAGE_MESSAGES'))
						reaction.users.remove(user);
					return false;
				}
				return true;
			}, { time: 60000, max: 1, dispose: true })).values())[0];
			if (reaction) {
				const emoji = reaction.emoji;
				if (emoji.url)
					command.message.guild.emojis.create(emoji.url, emoji.name);
				else if (command.message.channel.permissionsFor(command.message.guild.me).has('MANAGE_MESSAGES'))
					reaction.users.remove(command.message.author);
			} else if (!message.deleted)
				message.delete();
		} while (reaction);
	},
	permission: (message) => {
		if (!message.member.hasPermission('MANAGE_EMOJIS'))
			return false;
		return true;
	}
};