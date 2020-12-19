module.exports = {
	name: 'user',
	aliases: [],
	private: true,
	command: async command => {
		const users = [];
		for (const arg of command.args) {
			const user = await command.message.client.utils.getUserFromMention(arg);
			if (user)
				users.push(user);
		}
		if (!users.length)
			users.push(command.message.author);
		for (const user of users) {
			const embed = command.message.client.utils.createEmbed();
			embed.setThumbnail(user.displayAvatarURL({
				dynamic: true,
				size: 4096
			}));
			embed.setAuthor(user.tag);
			embed.setTimestamp();
			embed.addField('id', user.id, true);
			const flags = (await user.fetchFlags()).toArray();
			if (flags.length)
				embed.addField('flags', `\`${flags.join('`, `')}\``, true);
			embed.addField('createdAt', user.createdAt.toUTCString(), true);
			const member = await command.message.guild.members.fetch(user.id);
			if (member) {
				embed.addField('joinedAt', member.joinedAt.toUTCString(), true);
				if (member.premiumSince)
					embed.addField('premiumSince', member.premiumSince.toUTCString(), true);
				embed.addField('displayName', member.displayName, true);
				embed.addField('displayHexColor', member.displayHexColor, true);
				if (member.lastMessage)
					embed.addField('lastMessage', member.lastMessage.content, true);
				embed.addField('roles', Array.from(member.roles.cache.values()).join(', '), true);
				embed.addField('permissions', member.permissions.toArray().map(item => `\`${item}\``).join(', '));
			}
			command.message.client.utils.sendEmbed(command.message.channel, embed);
			console.log(user.embed);
		}
	}
};