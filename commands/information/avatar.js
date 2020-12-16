module.exports = {
	name: 'avatar',
	aliases: ['pp'],
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
			embed.setImage(user.displayAvatarURL({
				dynamic: true,
				size: 4096
			}));
			command.message.client.utils.sendEmbed(command.message.channel, embed);
		}
	}
};