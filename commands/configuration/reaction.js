module.exports = {
	name: 'reaction',
	description: 'description_reaction',
	permissions: ['MANAGE_ROLES', 'ADD_REACTIONS', 'MANAGE_MESSAGES'],
	options: [
		{
			type: 1,
			name: 'add',
			description: 'reaction_help_add',
			options: [
				{
					type: 3,
					name: 'message_id',
					description: 'reaction_help_add',
					required: true
				},
				{
					type: 8,
					name: 'role1',
					description: 'reaction_help_add',
					required: true
				},
				{
					type: 8,
					name: 'role2',
					description: 'reaction_help_add'
				},
				{
					type: 8,
					name: 'role3',
					description: 'reaction_help_add'
				},
				{
					type: 8,
					name: 'role4',
					description: 'reaction_help_add'
				},
				{
					type: 8,
					name: 'role5',
					description: 'reaction_help_add'
				}
			]
		},
		{
			type: 1,
			name: 'reset',
			description: 'reaction_help_reset'
		}
	],
	command: async object => {
		const guildData = await object.client.utils.readFile(object.client.utils.docRef.collection('guild').doc(object.guild.id));
		if (object.options[0].name == 'add') {
			const data = [];
			let message;
			for (const option of object.options[0].options.slice(1)) {
				const role = await object.guild.roles.fetch(option.value);
				console.log(option);
				let emoji;
				while (!emoji) {
					if (!message)
						message = await object.client.utils.sendMessage(object.channel, 'reaction_await_reaction', { role }, true);
					else
						await object.client.utils.replaceMessage(message, 'reaction_await_reaction', { role });
					const reaction = Array.from((await message.awaitReactions((reaction, user) => {
						if (object.channel.permissionsFor(object.guild.me).has('MANAGE_MESSAGES'))
							reaction.users.remove(user);
						if (user.id != object.user.id)
							return false;
						return true;
					}, { time: 60000, max: 1 })).values())[0];
					if (!reaction) {
						message.delete();
						return;
					}
					emoji = await message.react(reaction.emoji)
						.then(reaction => reaction.emoji)
						.catch(() => { });
					for (const reaction of data)
						if (reaction.emoji.name == emoji.name && reaction.emoji.id == emoji.id)
							emoji = null;
					if (!emoji && object.channel.permissionsFor(object.guild.me).has('MANAGE_MESSAGES'))
						reaction.users.remove(object.user);
				}
				data.push({ emoji, role });
			}
			message.delete();
			message = await object.channel.messages.fetch(object.options[0].options[0].value).catch(() => { });
			if (message == null) {
				const list = [];
				for (const reaction of data)
					list.push(`${reaction.emoji} - ${reaction.role}`);
				message = await object.client.utils.sendEmbed(object.channel, object.client.utils.createEmbed(`${object.client.utils.getMessage(object.channel, 'reaction_add')}\n\n${list.join('\n')}`));
			}
			for (const reaction of data)
				message.react(reaction.emoji);
			if (!guildData.reaction)
				guildData.reaction = {};
			if (!guildData.reaction[message.channel.id])
				guildData.reaction[message.channel.id] = {};
			guildData.reaction[message.channel.id][message.id] = [];
			for (const reaction of data)
				guildData.reaction[message.channel.id][message.id].push({
					emoji: reaction.emoji.id ? reaction.emoji.id : reaction.emoji.name,
					role: reaction.role.id
				});
		} else
			delete guildData.reaction;
		await object.client.utils.savFile(object.client.utils.docRef.collection('guild').doc(object.guild.id), guildData);
		if (object.options[0].name == 'reset')
			return object.client.utils.getMessage(object.channel, 'reaction_reset');
	},
	permission: object => {
		if (!object.member.hasPermission('ADMINISTRATOR'))
			return false;
		return true;
	},
	ready: async client => {
		for (const guild of client.guilds.cache.values()) {
			const guildData = await client.utils.readFile(client.utils.docRef.collection('guild').doc(guild.id));
			if (guildData.reaction)
				for (const channel of guild.channels.cache.values())
					if (guildData.reaction[channel.id])
						if (channel.type == 'text' && channel.viewable)
							channel.messages.fetch({ cache: true, force: true });
		}
	},
	messageReactionAdd: async (messageReaction, user) => {
		if (user.bot || messageReaction.message.channel.type == 'dm')
			return;
		const guildData = await messageReaction.client.utils.readFile(messageReaction.client.utils.docRef.collection('guild').doc(messageReaction.message.guild.id));
		if (!(guildData.reaction && guildData.reaction[messageReaction.message.channel.id]
			&& guildData.reaction[messageReaction.message.channel.id][messageReaction.message.id]))
			return;
		if (messageReaction.message.guild.me.hasPermission('MANAGE_ROLES')) {
			const member = await messageReaction.message.guild.members.fetch(user.id);
			if (member.manageable) {
				let emoji = messageReaction.emoji;
				emoji = emoji.id ? emoji.id : emoji.name;
				for (const reaction of guildData.reaction[messageReaction.message.channel.id][messageReaction.message.id])
					if (reaction.emoji == emoji) {
						const role = messageReaction.message.guild.roles.cache.get(reaction.role);
						if (role && role.position < messageReaction.message.guild.me.roles.highest.position) {
							member.roles.add(role);
							for (const reaction of messageReaction.message.reactions.cache.values())
								if (reaction != messageReaction)
									if ((await reaction.users.fetch()).get(user.id))
										reaction.users.remove(user);
							return;
						}
						break;
					}
			}
		}
		if (messageReaction.message.guild.me.hasPermission('MANAGE_MESSAGES'))
			messageReaction.users.remove(user);
	},
	messageReactionRemove: async (messageReaction, user) => {
		if (user.bot || messageReaction.message.channel.type == 'dm')
			return;
		if (!messageReaction.message.guild.me.hasPermission('MANAGE_ROLES'))
			return;
		const member = await messageReaction.message.guild.members.fetch(user.id);
		if (!member.manageable)
			return;
		const guildData = await messageReaction.client.utils.readFile(messageReaction.client.utils.docRef.collection('guild').doc(messageReaction.message.guild.id));
		if (!(guildData.reaction && guildData.reaction[messageReaction.message.channel.id]
			&& guildData.reaction[messageReaction.message.channel.id][messageReaction.message.id]))
			return;
		let emoji = messageReaction.emoji;
		emoji = emoji.id ? emoji.id : emoji.name;
		for (const reaction of guildData.reaction[messageReaction.message.channel.id][messageReaction.message.id])
			if (reaction.emoji == emoji) {
				const role = messageReaction.message.guild.roles.cache.get(reaction.role);
				if (role && role.position < messageReaction.message.guild.me.roles.highest.position)
					member.roles.remove(role);
				return;
			}
	}
}; 