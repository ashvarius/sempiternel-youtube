const cache = {};

const updateOverwrite = (guild, channel, user, see) => {
	if (!(cache[guild.id]))
		return;
	const object = cache[guild.id].find(item => item.voice = channel.id);
	if (!object)
		return;
	channel = guild.channels.cache.get(object.text);
	if (!channel)
		return;
	channel.updateOverwrite(user, {
		VIEW_CHANNEL: see
	}, this.name);
};

module.exports = {
	name: 'nomicro',
	description: 'description_nomicro',
	permissions: ['MANAGE_CHANNELS'],
	command: async object => {
		const guildData = await object.client.utils.readFile(object.client.utils.docRef.collection('guild').doc(object.guild.id));
		guildData.nomic = !guildData.nomic;
		await object.client.utils.savFile(object.client.utils.docRef.collection('guild').doc(object.guild.id), guildData);
		if (guildData.nomic)
			return object.client.utils.getMessage(object.channel, 'nomicro_true');
		return object.client.utils.getMessage(object.channel, 'nomicro_false');
	},
	checkPermission: object => {
		if (!object.member.hasPermission('ADMINISTRATOR'))
			return false;
		return true;
	},
	voiceStateUpdate: async (oldState, newState) => {
		if (oldState.channelID == newState.channelID)
			return;
		const guildData = await newState.guild.client.utils.readFile(newState.guild.client.utils.docRef.collection('guild').doc(newState.guild.id));
		if (!guildData.nomic || !newState.guild.me.hasPermission('MANAGE_CHANNELS'))
			return;
		if (oldState.channel && cache[newState.guild.id]) {
			let index = -1;
			for (const index1 of Object.keys(cache[newState.guild.id]))
				if (cache[newState.guild.id][index1].voice == oldState.channel.id)
					index = index1;
			if (index != -1)
				if (oldState.channel.members.size)
					updateOverwrite(newState.guild, oldState.channel, newState.member.user, null);
				else {
					const channel = newState.guild.channels.cache.get(cache[newState.guild.id][index].text);
					if (channel) {
						channel.delete();
						cache[newState.guild.id].splice(index, 1);
					}
				}
		}
		if (!newState.channel)
			return;
		if (newState.channel.members.size != 1) {
			updateOverwrite(newState.guild, newState.channel, newState.member.user, true);
			return;
		}
		let name = `${newState.guild.client.utils.getMessage(newState.channel, 'nomicro')} ${newState.channel.name}`;
		if (name.length > 32)
			name = name.substring(0, 32);
		const channel = await newState.guild.channels.create(name, {
			type: 'text',
			parent: newState.channel.parent,
			position: newState.channel.position,
			permissionOverwrites: [
				{
					id: newState.guild.me.id,
					allow: ['VIEW_CHANNEL', 'MANAGE_CHANNELS'],
				},
				{
					id: newState.member.id,
					allow: ['VIEW_CHANNEL'],
				},
				{
					id: newState.guild.roles.everyone.id,
					deny: ['VIEW_CHANNEL'],
				}
			],
			reason: this.name
		});
		if (!cache[newState.guild.id])
			cache[newState.guild.id] = [];
		cache[newState.guild.id].push({ voice: newState.channelID, text: channel.id });
	},
	destroy: async client => {
		for (let guild of Object.keys(cache)) {
			guild = client.guilds.cache.get(guild);
			if (!guild)
				continue;
			for (const object of cache[guild.id]) {
				const channel = guild.channels.cache.get(object.text);
				if (channel)
					await channel.delete();
			}
		}
	},
	guildDelete: guild => {
		delete cache[guild.id];
	}
};