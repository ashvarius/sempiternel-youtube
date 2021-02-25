module.exports = {
	name: 'avatar',
	private: true,
	description: 'description_avatar',
	options: [
		{
			type: 6,
			name: 'user1',
			description: 'description_avatar'
		},
		{
			type: 6,
			name: 'user2',
			description: 'description_avatar'
		},
		{
			type: 6,
			name: 'user3',
			description: 'description_avatar'
		},
		{
			type: 6,
			name: 'user4',
			description: 'description_avatar'
		},
		{
			type: 6,
			name: 'user5',
			description: 'description_avatar'
		}
	],
	command: async object => {
		const embeds = [];
		const users = [];
		if (object.options.length)
			for (const option of object.options) {
				let user = await object.client.users.fetch(option.value);
				if (user == null)
					embeds.push(object.client.utils.sendMessage(object.channel, 'error_not_found', {
						type: object.client.utils.getMessage(object.channel, 'user'),
						item: option.value
					}));
				users.push(user);
			}
		else
			users.push(object.user);
		for (const user of users) {
			const embed = object.client.utils.createEmbed();
			embed.setImage(user.displayAvatarURL({
				dynamic: true,
				size: 4096
			}));
			embeds.push(embed);
		}
		return embeds;
	}
};