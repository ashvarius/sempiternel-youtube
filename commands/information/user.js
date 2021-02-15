module.exports = {
	name: 'user',
	private: true,
	description: 'description_user',
	options: [
		{
			type: 6,
			name: 'user',
			description: 'description_user'
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
		return embed;
	}
};