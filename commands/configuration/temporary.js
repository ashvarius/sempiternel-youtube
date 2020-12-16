const cache = {};

module.exports = {
	name: 'temporary',
	aliases: [],
	command: command => {
		if (!command.args.length || !['add', 'remove'].includes(command.args[0].toLowerCase())) {
			const embed = command.message.client.utils.createEmbed();
			embed.addField(`${command.prefix}${command.command} add <channelId>`, command.message.client.utils.getMessage(command.message.channel, 'temporary_help_add'));
			embed.addField(`${command.prefix}${command.command} remove <channelId>`, command.message.client.utils.getMessage(command.message.channel, 'temporary_help_remove'));
			command.message.client.utils.sendEmbed(command.message.channel, embed);
			return;
		}
		const cmd = command.args[0].toLowerCase();
		if (command.args.length < 2) {
			const embed = command.message.client.utils.createEmbed();
			embed.addField(`${command.prefix}${command.command} ${cmd} <channelId>`, `${command.message.client.utils.getMessage(command.message.channel, `temporary_help_${cmd}`)}\n${command.message.client.utils.getMessage(command.message.channel, 'help_id')}`);
			command.message.client.utils.sendEmbed(command.message.channel, embed);
			return;
		}
		const channel = command.message.guild.channels.cache.get(command.args[1]);
		if (!(channel && channel.type == 'voice')) {
			command.message.client.utils.sendMessage(command.message.channel, 'error_channel_not_found');
			return;
		}
		const guildData = command.message.client.utils.readFile(`guilds/${command.message.guild.id}.json`);
		if (!guildData.temporary)
			guildData.temporary = [];
		if (cmd == 'add') {
			if (guildData.temporary.indexOf(channel.id) == -1)
				guildData.temporary.push(channel.id);
		} else if (!guildData.temporary.indexOf(channel.id) != -1)
			guildData.temporary.splice(guildData.temporary.indexOf(channel.id), 1);
		command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
		command.message.client.utils.sendMessage(command.message.channel, `temporary_${cmd}`, { channel });
	},
	permission: (message) => {
		if (!message.member.hasPermission('ADMINISTRATOR'))
			return false;
		return true;
	},
	voiceStateUpdate: async (oldState, newState) => {
		const guildData = newState.member.client.utils.readFile(`guilds/${newState.guild.id}.json`);
		if (!guildData.temporary)
			return;
		if (oldState.channelID
			&& cache[newState.guild.id]
			&& cache[newState.guild.id].includes(oldState.channelID)
			&& !Array.from(oldState.channel.members.filter(member => !member.user.bot)).length)
			oldState.channel.delete().then(() => cache[newState.guild.id].splice(cache[newState.guild.id].indexOf(oldState.channelID), 1)).catch(() => { });
		if (!(newState.channelID && guildData.temporary.includes(newState.channelID)))
			return;
		for (const permission of ['MANAGE_CHANNELS', 'MOVE_MEMBERS'])
			if (!newState.guild.me.hasPermission(permission))
				return;
		const channel = await newState.guild.channels.create(newState.member.displayName, {
			type: 'voice',
			parent: newState.channel.parent,
			permissionOverwrites: [
				{
					id: newState.guild.me.id,
					allow: ['VIEW_CHANNEL', 'MANAGE_CHANNELS', 'CONNECT'],
				},
				{
					id: newState.member.id,
					allow: ['MANAGE_CHANNELS', 'MUTE_MEMBERS', 'MOVE_MEMBERS'],
				}
			],
			reason: this.name
		});
		if (!cache[newState.guild.id])
			cache[newState.guild.id] = [];
		cache[newState.guild.id].push(channel.id);
		newState.setChannel(channel).catch(() => { });
	},
	destroy: async client => {
		for (let guild of Object.keys(cache)) {
			guild = client.guilds.cache.get(guild);
			if (!guild)
				continue;
			for (let channel of cache[guild.id]) {
				channel = guild.channels.cache.get(channel);
				if (channel)
					await channel.delete();
			}
		}
	}
};