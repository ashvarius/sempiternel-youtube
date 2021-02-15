module.exports = {
	name: 'avatar',
	private: true,
	standart: true,
	description: 'description_avatar',
	options: [
		{
			type: 6,
			name: 'user',
			description: 'description_avatar'
		}
	],
	command: async object => {
		let user;
		if (object.options[0] != null) {
			user = await object.client.users.fetch(object.options[0].value);
			if (user == null)
				return object.client.utils.sendMessage(object.channel, 'error_not_found', {
					type: object.client.utils.getMessage(object.channel, 'user'),
					item: object.options[0].value
				});
		} else
			user = object.user;
		const embed = object.client.utils.createEmbed();
		embed.setImage(user.displayAvatarURL({
			dynamic: true,
			size: 4096
		}));
		return embed;
	}
};