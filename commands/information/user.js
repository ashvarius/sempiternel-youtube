module.exports = {
	name: 'user',
	aliases: [],
	private: true,
	description: 'description_user',
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
			embed.addField(command.message.client.utils.getMessage(command.message.channel, 'bot'), command.message.client.utils.getMessage(command.message.channel, user.bot ? 'yes' : 'no'), true);
			embed.addField(command.message.client.utils.getMessage(command.message.channel, 'id'), user.id, true);
			const flags = (await user.fetchFlags()).toArray();
			if (flags.length)
				embed.addField(command.message.client.utils.getMessage(command.message.channel, 'badges'), `\`${flags.join('`, `')}\``, true);
			embed.addField(command.message.client.utils.getMessage(command.message.channel, 'creation date'), user.createdAt.toUTCString(), true);
			const member = command.message.channel.type != 'dm' && await command.message.guild.members.fetch(user.id);
			if (member) {
				embed.addField(command.message.client.utils.getMessage(command.message.channel, 'registration date'), member.joinedAt.toUTCString(), true);
				if (member.premiumSince)
					embed.addField(command.message.client.utils.getMessage(command.message.channel, 'date of premium purchase'), member.premiumSince.toUTCString(), true);
				embed.addField(command.message.client.utils.getMessage(command.message.channel, 'name'), member.displayName, true);
				embed.addField(command.message.client.utils.getMessage(command.message.channel, 'color'), member.displayHexColor, true);
				if (member.lastMessage && member.lastMessage.content)
					embed.addField(command.message.client.utils.getMessage(command.message.channel, 'last message'), member.lastMessage.content, true);
				embed.addField(command.message.client.utils.getMessage(command.message.channel, 'roles'), Array.from(member.roles.cache.values()).join(', '), true);
				embed.addField(command.message.client.utils.getMessage(command.message.channel, 'permissions'), member.permissions.toArray().map(item => `\`${item}\``).join(', '));
			}
			command.message.client.utils.sendEmbed(command.message.channel, embed);
		}
	}
};