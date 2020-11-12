module.exports = {
	name: 'reaction',
	aliases: [],
	command: async command => {
		if (!command.message.member.hasPermission('ADMINISTRATOR')) {
			command.message.client.utils.sendMessage(command.message.channel, 'error_no_permission', {
				permission: 'ADMINISTRATOR'
			});
			return;
		}
		for (const permission of ['MANAGE_ROLES', 'ADD_REACTIONS', 'MANAGE_EMOJIS'])
			if (!command.message.guild.me.hasPermission(permission)) {
				command.message.client.utils.sendMessage(command.message.channel, 'error_bot_no_permission', {
					permission: permission
				});
				return;
			}
		if (!command.args.length || !['add', 'reset'].includes(command.args[0].toLowerCase())) {
			const embed = command.message.client.utils.createEmbed();
			embed.addField(`${command.prefix}${command.command} add <role...> [messageId]`, command.message.client.utils.getMessage(command.message.channel, 'reaction_help_add'));
			embed.addField(`${command.prefix}${command.command} reset`, command.message.client.utils.getMessage(command.message.channel, 'reaction_help_reset'));
			command.message.client.utils.sendEmbed(command.message.channel, embed);
			return;
		}
		if (command.args[0].toLowerCase() == 'add') {
			if (!Array.from(command.message.mentions.roles.values()).length) {
				const embed = command.message.client.utils.createEmbed();
				embed.addField(`${command.prefix}${command.command} add <role...> [messageId]`, `${command.message.client.utils.getMessage(command.message.channel, 'reaction_help_add')}\n${command.message.client.utils.getMessage(command.message.channel, 'help_id')}`);
				command.message.client.utils.sendEmbed(command.message.channel, embed);
				return;
			}
			const data = [];
			let message;
			for (const role of command.message.mentions.roles.values()) {
				let emoji;
				while (!emoji) {
					if (!message)
						message = await command.message.client.utils.sendMessage(command.message.channel, 'reaction_await_reaction', { role });
					else
						await command.message.client.utils.replaceMessage(message, 'reaction_await_reaction', { role });
					const reaction = Array.from((await message.awaitReactions((reaction, user) => {
						if (command.message.channel.permissionsFor(command.message.guild.me).has('MANAGE_MESSAGES'))
							reaction.users.remove(user);
						if (user.id != command.message.author)
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
						if (reaction.emoji = emoji)
							emoji = null;
					if (!emoji && command.message.channel.permissionsFor(command.message.guild.me).has('MANAGE_MESSAGES'))
						reaction.users.remove(command.message.author);
				}
				data.push({ emoji, role });
			}
			message.delete();
			const list = [];
			for (const reaction of data)
				list.push(`${reaction.emoji} - ${reaction.role}`);
			message = await command.message.channel.messages.fetch(command.args[command.args.length - 1]).catch(() => { });
			if (!message)
				message = await command.message.client.utils.sendEmbed(command.message.channel, command.message.client.utils.createEmbed(`${command.message.client.utils.getMessage(command.message.channel, 'reaction_add')}\n${list.join('\n')}`));
			for (const reaction of data)
				message.react(reaction.emoji);
			const guildData = command.message.client.utils.readFile(`guilds/${command.message.guild.id}.json`);
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
			command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
		} else {
			const guildData = command.message.client.utils.readFile(`guilds/${command.message.guild.id}.json`);
			delete guildData.reaction;
			command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
			command.message.client.utils.sendMessage(command.message.channel, 'reaction_reset');
		}
	},
	ready: (client) => {
		for (const guild of client.guilds.cache.values()) {
			const guildData = client.utils.readFile(`guilds/${guild.id}.json`);
			if (guildData.reaction)
				for (const channel of guild.channels.cache.values()) 
					if (guildData.reaction[channel.id])
						if (channel.type == 'text' && channel.viewable)
							channel.messages.fetch({ cache: true, force: true});
		}
	},
	permission: (message) => {
		if (!message.member.hasPermission('ADMINISTRATOR'))
			return false;
		return true;
	},
	messageReactionAdd: async (messageReaction, user) => {
		if (user.bot || messageReaction.message.channel.type == 'dm')
			return;
		const guildData = messageReaction.client.utils.readFile(`guilds/${messageReaction.message.guild.id}.json`);
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
						if (role) {
							member.roles.add(role);
							for (const reaction of messageReaction.message.reactions.cache.values())
								if (reaction != messageReaction)
									if ((await reaction.users.fetch()).get(user.id))
										reaction.users.remove(user);
							console.log(messageReaction.message.reactions.cache);
							return;
						}
						break;
					}
			}
		}
		if (messageReaction.message.guild.me.hasPermission('MANAGE_EMOJIS'))
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
		const guildData = messageReaction.client.utils.readFile(`guilds/${messageReaction.message.guild.id}.json`);
		if (!(guildData.reaction && guildData.reaction[messageReaction.message.channel.id]
			&& guildData.reaction[messageReaction.message.channel.id][messageReaction.message.id]))
			return;
		let emoji = messageReaction.emoji;
		emoji = emoji.id ? emoji.id : emoji.name;
		for (const reaction of guildData.reaction[messageReaction.message.channel.id][messageReaction.message.id])
			if (reaction.emoji == emoji) {
				const role = messageReaction.message.guild.roles.cache.get(reaction.role);
				member.roles.remove(role);
				return;
			}
	}
}; 