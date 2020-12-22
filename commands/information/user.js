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
			const member = command.message.channel.type != 'dm' && await command.message.guild.members.fetch(user.id).catch(() => { });
			if (member)
				embed.addFields([
					{
						name: `📢 ${command.message.client.utils.getMessage(command.message.channel, 'name')}`,
						value: member.displayName,
						inline: true
					},
					{
						name: `🎨 ${command.message.client.utils.getMessage(command.message.channel, 'color')}`,
						value: member.displayHexColor,
						inline: true
					}
				]);
			embed.addFields([
				{
					name: `💾 ${command.message.client.utils.getMessage(command.message.channel, 'id')}`,
					value: user.id,
					inline: true
				}
			]);
			embed.addFields({
				name: `🔮 ${command.message.client.utils.getMessage(command.message.channel, 'creation date')}`,
				value: user.createdAt.toUTCString(),
				inline: true
			});
			if (member)
				embed.addFields({
					name: `🎓 ${command.message.client.utils.getMessage(command.message.channel, 'registration date')}`,
					value: member.joinedAt.toUTCString(),
					inline: true
				});
			const flags = (await user.fetchFlags()).toArray();
			if (flags.length)
				embed.addFields({
					name: `✨ ${command.message.client.utils.getMessage(command.message.channel, 'badges')}`,
					value: flags.map(item => `\`${item}\``).join(', '),
					inline: true
				});
			if (member) {
				if (member.premiumSince)
					embed.addFields({
						name: `🎁 ${command.message.client.utils.getMessage(command.message.channel, 'date of premium purchase')}`,
						value: member.premiumSince.toUTCString(),
						inline: true
					});
				embed.addFields([
					{
						name: `🏆 ${command.message.client.utils.getMessage(command.message.channel, 'roles')}`,
						value: Array.from(member.roles.cache.values()).join(', '),
						inline: true
					},
					{
						name: `🎫 ${command.message.client.utils.getMessage(command.message.channel, 'permissions')}`,
						value: member.permissions.toArray().map(item => `\`${item}\``).join(', ')
					}
				]);
			}
			command.message.client.utils.sendEmbed(command.message.channel, embed);
		}
	}
};