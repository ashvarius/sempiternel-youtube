const ytdl = require('discord-ytdl-core');
const emojis = {
	random: '🔀',
	previous: '⏮️',
	pause: '⏯️',
	next: '⏭️',
	repeat: '🔁'
};

const updateMessage = (client, guildId) => {
	const guildData = client.utils.readFile(`guilds/${guildId}.json`);
	const channel = client.guilds.cache.get(guildId).channels.cache.get(guildData.music.channel);
	if (!channel)
		return;
	const message = channel.messages.cache.get(guildData.music.message);
	if (!message)
		return;
	const options = [];
	for (const key of Object.keys(emojis))
		if (client.music[guildId][key])
			options.push(client.utils.getMessage(message.channel, key));
	let content = '';
	if (options.length)
		content += `${client.utils.getMessage(message.channel, 'activate')}: ${options.join(', ')}\n\n`;
	content += `${client.utils.getMessage(message.channel, 'now')} - [${client.music[guildId].now.videoDetails.title}](${client.music[guildId].now.videoDetails.video_url})`;
	const array = [client.music[guildId].now.videoDetails.videoId];
	if (client.music[guildId].playlist.length) {
		content += '\n';
		let index = 0;
		let video;
		while ((video = client.music[guildId].playlist[index++])) {
			content += `\n${index} - [${video.videoDetails.title}](${video.videoDetails.video_url})`;
			array.push(video.videoDetails.videoId);
		}
	}
	const embed = client.utils.createEmbed(content);
	embed.setThumbnail(client.music[guildId].now.videoDetails.thumbnail.thumbnails[client.music[guildId].now.videoDetails.thumbnail.thumbnails.length - 1].url);
	message.edit(`||${client.utils.getMessage(message.channel, 'music_playlist', { json: JSON.stringify(array) })}||`, { embed })
};

const play = async (client, guildId) => {
	const connection = client.music[guildId].connection;
	if (!client.music[guildId].playlist.length) {
		connection.disconnect();
		return;
	}
	let index;
	if (client.music[guildId].random)
		index = Math.floor(Math.random() * client.music[guildId].playlist.length);
	else
		index = 0;
	const video = client.music[guildId].playlist[index];
	client.music[guildId].playlist.splice(index, 1);
	client.music[guildId].now = video;
	const format = ytdl.chooseFormat(video.formats, { filter: 'audioonly', quality: 'highestaudio' });
	const stream = ytdl.arbitraryStream(format.url, {
		opusEncoded: true,
		encoderArgs: ['-af', 'bass=g=10,dynaudnorm=f=200']
	});
	dispatcher = connection.play(stream, { type: "opus", bitrate: 48 });
	dispatcher.on('finish', () => {
		if (!Array.from(client.music[guildId].connection.channel.members.values()).filter(member => !member.user.bot).length) {
			client.music[guildId].connection.disconnect();
			return;
		}
		if (client.music[guildId].repeat && client.music[guildId].now)
			client.music[guildId].playlist.push(client.music[guildId].now);
		play(client, guildId);
	});
	updateMessage(client, guildId);
}

module.exports = {
	name: 'music',
	aliases: [],
	private: false,
	command: async command => {
		for (const permission of ['MANAGE_CHANNELS', 'CONNECT', 'SPEAK'])
			if (!command.message.guild.me.hasPermission(permission)) {
				command.message.client.utils.sendMessage(command.message.channel, 'error_bot_no_permission', {
					permission
				});
				return;
			}
		const guildData = command.message.client.utils.readFile(`guilds/${command.message.guild.id}.json`);
		if (guildData.music && command.message.guild.channels.cache.get(guildData.music.channel)) {
			command.message.client.utils.sendMessage(command.message.channel, 'error_channel_exists');
			return;
		}
		const channel = await command.message.guild.channels.create('Music', {
			type: 'text',
			topic: 'This channel is designed to handle music.',
			parent: command.message.channel.parent,
			permissionOverwrites: [
				{
					id: command.message.guild.me.id,
					allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES', 'ADD_REACTIONS']
				}
			],
			reason: 'Create a music channel'
		});
		const message = await command.message.client.utils.sendMessage(channel, 'music_watting');
		guildData.music = {
			channel: channel.id,
			message: message.id
		};
		command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
		command.message.client.utils.sendMessage(command.message.channel, 'music_success');
		for (const emoji of Object.values(emojis))
			message.react(emoji);
	},
	permission: (message) => {
		if (!message.member.hasPermission('ADMINISTRATOR'))
			return false;
		return true;
	},
	message: async (message) => {
		if (message.channel.type == 'dm' || message.author.id == message.client.user.id)
			return;
		const guildData = message.client.utils.readFile(`guilds/${message.guild.id}.json`);
		if (!guildData.music)
			return;
		const channel = message.guild.channels.cache.get(guildData.music.channel);
		if (!(channel == message.channel && channel.permissionsFor(message.guild.me).has('MANAGE_MESSAGES')))
			return;
		message.delete();
		if (message.author.bot)
			return;
		let ids = [];
		try {
			const temp = JSON.parse(message.content);
			ids = ids.concat(temp);
		} catch {
			ids.push(message.content);
		}
		for (let id of ids) {
			let video;
			try {
				video = await ytdl.getInfo(id);
			} catch (error) {
				const send = await message.client.utils.sendMessage(message.channel, 'error_api', { error: error.message });
				send.delete({ timeout: 10 * 1000 });
				break;
			}
			if (!message.guild.me.voice.channelID) {
				const channel = await message.guild.channels.cache.get(message.member.voice.channelID);
				if (!(channel && channel.joinable))
					return;
				await channel.join();
			}
			if (!message.client.music)
				message.client.music = {};
			if (!message.client.music[message.guild.id])
				message.client.music[message.guild.id] = {};
			if (!message.client.music[message.guild.id].playlist)
				message.client.music[message.guild.id].playlist = [];
			if (!message.client.music[message.guild.id].connection) {
				const connection = message.guild.me.voice.connection;
				connection.on('disconnect', () => {
					delete message.client.music[message.guild.id];
					const guildData = message.client.utils.readFile(`guilds/${message.guild.id}.json`);
					const channel = message.guild.channels.cache.get(guildData.music.channel);
					if (!channel)
						return;
					const message1 = channel.messages.cache.get(guildData.music.message);
					if (!message1)
						return;
					message1.edit('', { embed: message.client.utils.createEmbed(message.client.utils.getMessage(message1.channel, 'music_watting')) });
				});
				message.client.music[message.guild.id].connection = connection;
			}
			message.client.music[message.guild.id].playlist.push(video);
			if (!message.client.music[message.guild.id].now)
				play(message.client, message.guild.id);
			else
				updateMessage(message.client, message.guild.id);
		}
	},
	messageReactionAdd: (messageReaction, user) => {
		if (user.id == messageReaction.client.user.id)
			return;
		const guildData = messageReaction.client.utils.readFile(`guilds/${messageReaction.message.guild.id}.json`);
		if (!(guildData.music && messageReaction.message.id == guildData.music.message))
			return;
		messageReaction.users.remove(user);
		if (!(messageReaction.client.music && messageReaction.client.music[messageReaction.message.guild.id]))
			return;
		if (messageReaction.emoji.name == emojis.previous) {
			messageReaction.client.music[messageReaction.message.guild.id].playlist.splice(0, 0, messageReaction.client.music[messageReaction.message.guild.id].now);
			if (messageReaction.client.music[messageReaction.message.guild.id].repeat
				&& messageReaction.client.music[messageReaction.message.guild.id].connection.dispatcher.streamTime < 10 * 1000) {
				const video = messageReaction.client.music[messageReaction.message.guild.id].playlist.splice(messageReaction.client.music[messageReaction.message.guild.id].playlist.length - 1, 1)[0];
				messageReaction.client.music[messageReaction.message.guild.id].playlist.splice(0, 0, video);
			}
			messageReaction.client.music[messageReaction.message.guild.id].now = null;
		}
		if (messageReaction.emoji.name == emojis.previous || messageReaction.emoji.name == emojis.next)
			messageReaction.client.music[messageReaction.message.guild.id].connection.dispatcher.emit('finish');
		else if (messageReaction.emoji.name == emojis.pause) {
			const dispatcher = messageReaction.client.music[messageReaction.message.guild.id].connection.dispatcher;
			if (dispatcher.paused)
				dispatcher.resume();
			else
				dispatcher.pause();
		} else {
			for (const key of Object.keys(emojis))
				if (messageReaction.emoji.name == emojis[key])
					messageReaction.client.music[messageReaction.message.guild.id][key] = !messageReaction.client.music[messageReaction.message.guild.id][key];
			updateMessage(messageReaction.client, messageReaction.message.guild.id);
		}
	},
	messageDelete: async (message) => {
		if (!message.channel.type == 'dm')
			return;
		const guildData = message.client.utils.readFile(`guilds/${message.guild.id}.json`);
		if (!(guildData.music && message.id == guildData.music.message))
			return;
		message = await message.client.utils.sendMessage(message.channel, 'music_watting');
		guildData.music.message = message.id;
		message.client.utils.savFile(`guilds/${message.guild.id}.json`, guildData);
		for (const emoji of Object.values(emojis))
			message.react(emoji);
	},
	ready: async (client) => {
		for (const guild of client.guilds.cache.values()) {
			const guildData = client.utils.readFile(`guilds/${guild.id}.json`);
			if (!guildData.music)
				continue;
			const channel = guild.channels.cache.get(guildData.music.channel);
			if (!channel)
				continue;
			while (1) {
				let removed = 0;
				for (const message of (await channel.messages.fetch({ force: true })).values())
					if (message.id != guildData.music.message) {
						await message.delete();
						removed++;
					}
				if (!removed)
					break;
			}
			let message = await channel.messages.cache.get(guildData.music.message);
			if (!message) {
				message = await client.utils.sendMessage(channel, 'music_watting');
				guildData.music.message = message.id;
				client.utils.savFile(`guilds/${guild.id}.json`, guildData);
				for (const emoji of Object.values(emojis))
					message.react(emoji);
			}
			for (const reaction of message.reactions.cache.values())
				for (const user of (await reaction.users.fetch()).values())
					if (user != client.user)
						reaction.users.remove(user);
		}
	},
	destroy: async client => {
		if (!client.music)
			return;
		for (let guild of client.guilds.cache.values())
			if (client.music[guild.id]) {
				const guildData = client.utils.readFile(`guilds/${guild.id}.json`);
				const channel = guild.channels.cache.get(guildData.music.channel);
				if (!channel)
					return;
				const message = channel.messages.cache.get(guildData.music.message);
				if (!message)
					return;
				await message.edit('', { embed: client.utils.createEmbed(client.utils.getMessage(message.channel, 'music_watting')) });
			}
		delete client.music;
	}
};