const cache = {};

module.exports = {
	name: 'temporary',
	description: 'description_temporary',
	options: [
		{
			type: 1,
			name: 'add',
			description: 'temporary_help_add',
			options: [
				{
					type: 7,
					name: 'channel',
					description: 'temporary_help_add',
					required: true
				}
			]
		},
		{
			type: 1,
			name: 'remove',
			description: 'temporary_help_remove',
			options: [
				{
					type: 7,
					name: 'channel',
					description: 'temporary_help_remove',
					required: true
				}
			]
		}
	],
	permissions: ['MANAGE_CHANNELS', 'MOVE_MEMBERS'],
	command: async object => {
		const channel = object.guild.channels.cache.get(object.options[0].options[0].value);
		if (!(channel && channel.type == 'voice'))
			return object.client.utils.getMessage(object.channel, 'error_not_found', {
				type: 'channel',
				item: object.options[0].options[0].value
			});
		const guildData = await object.client.utils.readFile(object.client.utils.docRef.collection('guild').doc(object.guild.id));
		if (!guildData.temporary)
			guildData.temporary = [];
		if (object.options[0].name == 'add') {
			if (guildData.temporary.indexOf(channel.id) == -1)
				guildData.temporary.push(channel.id);
		} else if (!guildData.temporary.indexOf(channel.id) != -1)
			guildData.temporary.splice(guildData.temporary.indexOf(channel.id), 1);
		await object.client.utils.savFile(object.client.utils.docRef.collection('guild').doc(object.guild.id), guildData);
		return object.client.utils.getMessage(object.channel, `temporary_${object.options[0].name}`, { channel });
	},
	checkPermission: object => {
		if (!object.member.hasPermission('ADMINISTRATOR'))
			return false;
		return true;
	},
	voiceStateUpdate: async (oldState, newState) => {
		const guildData = await newState.guild.client.utils.readFile(newState.guild.client.utils.docRef.collection('guild').doc(newState.guild.id));
		if (!guildData.temporary)
			return;
		if (oldState.channel
			&& cache[newState.guild.id]
			&& !Array.from(oldState.channel.members).length)
			for (const index of cache[newState.guild.id].keys()) {
				const object = cache[newState.guild.id][index];
				if (object.channel == oldState.channelID) {
					const channel = newState.guild.channels.cache.get(object.channel);
					if (channel)
						channel.delete();
					const waiting = newState.guild.channels.cache.get(object.waiting);
					if (waiting)
						waiting.delete();
					break;
				}
			}
		if (!(newState.channelID && guildData.temporary.includes(newState.channelID)))
			return;
		for (const permission of ['MANAGE_CHANNELS', 'MOVE_MEMBERS'])
			if (!newState.guild.me.hasPermission(permission))
				return;
		let name = newState.member.displayName;
		name = name.split(' ')[0];
		if (name.length > 8)
			name = name.substring(0, 8);
		const channel = await newState.guild.channels.create(newState.guild.client.utils.getMessage(newState.channel, 'temporary_channel', {
			user: name
		}), {
			type: 'voice',
			parent: newState.channel.parent,
			permissionOverwrites: [
				{
					id: newState.guild.me.id,
					allow: ['CONNECT', 'MANAGE_CHANNELS'],
				},
				{
					id: newState.member.id,
					allow: ['CONNECT', 'MANAGE_CHANNELS', 'MOVE_MEMBERS'],
				},
				{
					id: newState.guild.roles.everyone.id,
					deny: ['CONNECT'],
				}
			],
			reason: this.name
		});
		const waiting = await newState.guild.channels.create(newState.guild.client.utils.getMessage(newState.channel, 'temporary_waiting', {
			user: name
		}), {
			type: 'voice',
			parent: newState.channel.parent,
			permissionOverwrites: [
				{
					id: newState.guild.me.id,
					allow: ['MANAGE_CHANNELS'],
				},
				{
					id: newState.member.id,
					allow: ['MOVE_MEMBERS'],
				},
				{
					id: newState.guild.roles.everyone.id,
					deny: ['SPEAK'],
				}
			],
			reason: this.name
		});
		if (!cache[newState.guild.id])
			cache[newState.guild.id] = [];
		newState.setChannel(channel)
			.then(() => cache[newState.guild.id].push({ channel: channel.id, waiting: waiting.id }))
			.catch(() => {
				channel.delete();
				waiting.delete();
			});
	},
	destroy: async client => {
		for (let guild of Object.keys(cache)) {
			guild = client.guilds.cache.get(guild);
			if (!guild)
				continue;
			for (const object of cache[guild.id]) {
				const channel = guild.channels.cache.get(object.channel);
				if (channel)
					await channel.delete();
				const waiting = guild.channels.cache.get(object.waiting);
				if (waiting)
					await waiting.delete();
			}
		}
	}
};