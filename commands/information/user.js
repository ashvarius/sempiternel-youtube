module.exports = {
	name: 'user',
	private: true,
	description: 'description_user',
	options: [
		{
			type: 6,
			name: 'user1',
			description: 'description_user'
		},
		{
			type: 6,
			name: 'user2',
			description: 'description_user'
		},
		{
			type: 6,
			name: 'user3',
			description: 'description_user'
		},
		{
			type: 6,
			name: 'user4',
			description: 'description_user'
		},
		{
			type: 6,
			name: 'user5',
			description: 'description_user'
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
			embed.setThumbnail(user.displayAvatarURL({
				dynamic: true,
				size: 4096
			}));
			embed.setAuthor(user.tag);
			embed.setTimestamp();
			const member = object.channel.type != 'dm' && await object.guild.members.fetch(user.id).catch(() => { });
			if (member)
				embed.addFields([
					{
						name: `📢 ${object.client.utils.getMessage(object.channel, 'name')}`,
						value: member.displayName,
						inline: true
					},
					{
						name: `🎨 ${object.client.utils.getMessage(object.channel, 'color')}`,
						value: member.displayHexColor,
						inline: true
					}
				]);
			embed.addFields([
				{
					name: `💾 ${object.client.utils.getMessage(object.channel, 'id')}`,
					value: user.id,
					inline: true
				}
			]);
			embed.addFields({
				name: `🔮 ${object.client.utils.getMessage(object.channel, 'creation date')}`,
				value: user.createdAt.toUTCString(),
				inline: true
			});
			if (member) {
				embed.addFields({
					name: `🎓 ${object.client.utils.getMessage(object.channel, 'registration date')}`,
					value: member.joinedAt.toUTCString(),
					inline: true
				});
				if (member.premiumSince)
					embed.addFields({
						name: `🎁 ${object.client.utils.getMessage(object.channel, 'date of premium purchase')}`,
						value: member.premiumSince.toUTCString(),
						inline: true
					});
			}
			const flags = (await user.fetchFlags()).toArray();
			if (flags.length)
				embed.addFields({
					name: `✨ ${object.client.utils.getMessage(object.channel, 'badges')}`,
					value: flags.map(item => `\`${item}\``).join(', '),
					inline: true
				});
			if (member)
				embed.addFields([
					{
						name: `🏆 ${object.client.utils.getMessage(object.channel, 'roles')}`,
						value: Array.from(member.roles.cache.values()).join(', '),
						inline: true
					},
					{
						name: `🎫 ${object.client.utils.getMessage(object.channel, 'permissions')}`,
						value: member.permissions.toArray().map(item => `\`${item}\``).join(', ')
					}
				]);
			embeds.push(embed);
		}
		return embeds;
	}
};