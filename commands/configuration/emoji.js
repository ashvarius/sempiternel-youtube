module.exports = {
	name: 'emoji',
	description: 'description_emoji',
	command: async object => {
		if (!object.guild.me.hasPermission('MANAGE_EMOJIS')) {
			object.client.utils.sendMessage(object.channel, 'error_bot_no_permission', {
				permission: 'MANAGE_EMOJIS'
			});
			return;
		}
		const message = await object.client.utils.sendMessage(object.channel, 'emoji_await_reaction');
		let reaction;
		do {
			reaction = Array.from((await message.awaitReactions((reaction, user) => {
				if (user.id != object.user.id) {
					if (object.channel.permissionsFor(object.guild.me).has('MANAGE_MESSAGES'))
						reaction.users.remove(user);
					return false;
				}
				return true;
			}, { time: 60000, max: 1, dispose: true })).values())[0];
			if (reaction) {
				const emoji = reaction.emoji;
				if (emoji.url)
					object.guild.emojis.create(emoji.url, emoji.name);
				else if (object.channel.permissionsFor(object.guild.me).has('MANAGE_MESSAGES'))
					reaction.users.remove(object.user);
			} else if (!message.deleted)
				message.delete();
		} while (reaction);
	},
	permission: object => {
		if (!object.member.hasPermission('MANAGE_EMOJIS'))
			return false;
		return true;
	}
};