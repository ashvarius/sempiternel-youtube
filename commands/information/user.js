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
			embed.addField('createdAt', user.createdAt.toUTCString());
			embed.addField('id', user.id);
			const flags = (await user.fetchFlags()).toArray();
			if (flags.length)
				embed.addField('flags', `\`${flags.join('`, `')}\``);
			command.message.client.utils.sendEmbed(command.message.channel, embed);
		}
	}
};