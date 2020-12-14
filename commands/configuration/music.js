const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const ytpl = require('ytpl');
const url = require('url');
const emojis = Object.freeze({
	random: '🔀',
	previous: '⏮️',
	pause: '⏯️',
	next: '⏭️',
	repeat: '🔁',
	autoplay: '📻',
	pageup: '⤴️',
	pagedown: '⤵️',
	own: '📃',
	save: '📥',
	free: '📤'
});
const max = Object.freeze({
	page: 16,
	video: 50,
	update: 2,
	bitrate: 48
});
const FFMPEG_ARGUMENTS = [
	'-af', 'bass=g=10,dynaudnorm'
];
const cache = {};

const getvideo = async (client, id) => {
	if (cache[id])
		return cache[id];
	video = await ytdl.getInfo(id, {
		requestOptions: {
			headers: {
				cookie: client.config['youtube-cookie']
			}
		}
	});
	if (video.videoDetails.isLiveContent)
		return;
	if (video.videoDetails.title.length > 50)
		video.videoDetails.title = `${video.videoDetails.title.substring(0, 50)}...`;
	const format = ytdl.chooseFormat(video.formats, { filter: 'audioonly', quality: 'highestaudio' });
	video = {
		title: video.videoDetails.title.replace(/\[|\]/g, '|').replace(/\`/g, '\''),
		url: video.videoDetails.video_url,
		id: video.videoDetails.videoId,
		thumbnail: video.videoDetails.thumbnail.thumbnails[video.videoDetails.thumbnail.thumbnails.length - 1].url,
		next: video.related_videos.length && video.related_videos[Math.floor(Math.random() * video.related_videos.length)].id,
		format: {
			url: format.url
		}
	};
	cache[id] = video;
	return video;
};

const waitingembed = (client, channel) => {
	let description = `${client.utils.getMessage(channel, 'music_watting')}\n`;
	for (const key of Object.keys(emojis))
		description += `\n${emojis[key]} ${client.utils.getMessage(channel, `music_reaction_${key}`)}`;
	return client.utils.createEmbed(description);
}

const updateMessage = async (client, guildId) => {
	if (!client.music[guildId])
		return;
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
	let content = client.music[guildId].connection.dispatcher && client.music[guildId].connection.dispatcher.paused ? '⏸️' : '▶️';
	if (options.length)
		content += `\n${client.utils.getMessage(message.channel, 'activate')}: ${options.join(', ')}\n`;
	const now = await getvideo(client, client.music[guildId].now.id);
	content += `\n${client.utils.getMessage(message.channel, 'now')} - [${now.title}](${now.url})`;
	const array = [video.id];
	if (client.music[guildId].playlist.length) {
		content += '\n';
		const min = client.music[guildId].page * max.page;
		let index = 0;
		let info;
		while ((info = client.music[guildId].playlist[index++])) {
			if (index > min && index <= min + max.page) {
				const video = await getvideo(client, info.id);
				content += `\n${index} - [${video.title}](${video.url})`;
			}
			array.push(info.id);
		}
	}
	const send = async () => {
		if (!client.music[guildId])
			return;
		client.music[guildId].embed = { content, last: 0 };
		const embed = client.utils.createEmbed(content);
		embed.setThumbnail(now.thumbnail);
		const sent = await message.edit(`||${client.utils.getMessage(message.channel, 'music_playlist')}\n${JSON.stringify(array)}||`, { embed });
		if (!client.music[guildId])
			return;
		client.music[guildId].embed.last = Date.now();
		if (client.music[guildId].embed.timeout)
			delete client.music[guildId].embed.timeout;
		return sent;
	};
	if (client.music[guildId].embed) {
		if (client.music[guildId].embed.timeout)
			clearTimeout(client.music[guildId].embed.timeout);
		if (client.music[guildId].embed.content == content)
			return message;
		if (client.music[guildId].embed.last + max.update * 1000 > Date.now()) {
			client.music[guildId].embed.timeout = setTimeout(send, client.music[guildId].embed.last + max.update * 1000 - Date.now());
			return message;
		}
	}
	return await send();
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
	const info = client.music[guildId].playlist[index];
	client.music[guildId].playlist.splice(index, 1);
	if (client.music[guildId].playlist.length <= client.music[guildId].page * max.page)
		client.music[guildId].page--;
	client.music[guildId].now = info;
	const video = await getvideo(client, info.id);
	const transcoder = client.utils.generateTranscoder(video.format.url, {
		start: info.time,
		args: FFMPEG_ARGUMENTS
	});
	await client.music[guildId].connection.voice.setSelfMute(false);
	const dispatcher = client.utils.playeTranscoder(client.music[guildId].connection.player, transcoder);
	dispatcher.on('finish', async () => {
		try {
			await client.music[guildId].connection.voice.setSelfMute(true);
			if (!Array.from(client.music[guildId].connection.channel.members.values()).filter(member => !member.user.bot).length) {
				client.music[guildId].connection.disconnect();
				return;
			}
			if (client.music[guildId].now
				&& (client.music[guildId].repeat || client.music[guildId].autoplay)) {
				const guildData = client.utils.readFile(`guilds/${guildId}.json`);
				const channel = client.guilds.cache.get(guildId).channels.cache.get(guildData.music.channel);
				if (channel)
					if (client.music[guildId].repeat)
						await add([client.music[guildId].now.id], channel, null, true);
					else if (client.music[guildId].autoplay && client.music[guildId].now.id && !client.music[guildId].playlist.length) {
						const video = await getvideo(client, client.music[guildId].now.id);
						if (video.next)
							await add([video.next], channel, null, true);
					}
			}
			await play(client, guildId);
		} catch (error) {
			console.log(error);
		}
	});
	if (client.music[guildId].connection.voice.serverMute) {
		client.music[guildId].connection.dispatcher.pause();
		await client.music[guildId].connection.voice.setSelfMute(true);
	}
	await updateMessage(client, guildId);
}

const add = async (ids, channel, member, silence = false) => {
	const guild = channel.guild;
	for (let id of ids) {
		if (channel.client.music && channel.client.music[guild.id] && channel.client.music[guild.id].playlist.length >= max.video) {
			const send = await channel.client.utils.sendMessage(channel, 'error_full');
			send.delete({ timeout: 10 * 1000 });
			break;
		}
		let time = url.parse(id, true).query.t;
		if (!time)
			time = 0;
		try {
			id = ytdl.getVideoID(id);
			const video = await getvideo(channel.client, id, time);
			if (!video)
				continue;
			if (!guild.me.voice.channelID) {
				const voice = member && await guild.channels.cache.get(member.voice.channelID);
				if (!(voice && voice.joinable && voice.speakable))
					return;
				await voice.join().then(connection => {
					connection.voice.setSelfMute(true);
					connection.voice.setSelfDeaf(true);
				});
			}
		} catch (error) {
			const send = await channel.client.utils.sendMessage(channel, 'error_api', { error: error.message });
			send.delete({ timeout: 10 * 1000 });
			continue;
		}
		if (!channel.client.music)
			channel.client.music = {};
		if (!channel.client.music[guild.id]) {
			channel.client.music[guild.id] = {};
			channel.client.music[guild.id].playlist = [];
			channel.client.music[guild.id].page = 0;
		}
		if (!channel.client.music[guild.id].connection) {
			const connection = guild.me.voice.connection;
			if (!connection)
				return;
			connection.on('disconnect', () => {
				try {
					if (!guild.client.music)
						return;
					delete guild.client.music[guild.id];
					const guildData = guild.client.utils.readFile(`guilds/${guild.id}.json`);
					const channel = guild.channels.cache.get(guildData.music.channel);
					if (!channel)
						return;
					const message = channel.messages.cache.get(guildData.music.message);
					if (!message)
						return;
					message.edit('', { embed: waitingembed(channel.client, channel) });
				} catch (error) {
					console.log(error);
				}
			});
			channel.client.music[guild.id].connection = connection;
		}
		channel.client.music[guild.id].playlist.push({ id, time });
		while (channel.client.music[guild.id].playlist.length > (channel.client.music[guild.id].page + 1) * max.page)
			channel.client.music[guild.id].page++;
		if (!channel.client.music[guild.id].now)
			await play(channel.client, guild.id);
		else if (!silence)
			await updateMessage(guild.client, guild.id);
	}
}

module.exports = {
	name: 'music',
	aliases: [],
	command: async command => {
		for (const permission of ['MANAGE_CHANNELS', 'CONNECT'])
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
					allow: ['ADD_REACTIONS', 'VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES', 'READ_MESSAGE_HISTORY']
				}
			],
			rateLimitPerUser: 5,
			reason: 'Create a music channel'
		});
		const message = await command.message.client.utils.sendEmbed(channel, waitingembed(command.message.client, channel));
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
		await message.delete();
		if (message.author.bot)
			return;
		let ids = [];
		try {
			const temp = JSON.parse(message.content);
			ids = ids.concat(temp);
		} catch {
			try {
				const playlist = await ytpl(message.content);
				for (const item of playlist.items)
					ids.push(item.id);
			} catch {
				try {
					new URL(message.content);
					ids.push(message.content);
				} catch {
					const filters = await ytsr.getFilters(message.content);
					const filter = filters.get('Type').get('Video');
					if (!filter.url)
						return;
					const search = await ytsr(filter.url, { limit: 1 });
					if (!search.items.length)
						return;
					ids.push(search.items[0].id);
				}
			}
		}
		await add(ids, message.channel, message.member);
	},
	messageReactionAdd: async (messageReaction, user) => {
		if (user.id == messageReaction.client.user.id)
			return;
		const guildData = messageReaction.client.utils.readFile(`guilds/${messageReaction.message.guild.id}.json`);
		if (!(guildData.music && messageReaction.message.id == guildData.music.message))
			return;
		messageReaction.users.remove(user);
		if (!(messageReaction.client.music && messageReaction.client.music[messageReaction.message.guild.id])) {
			if (messageReaction.emoji.name == emojis.own) {
				const userData = messageReaction.client.utils.readFile(`users/${user.id}.json`);
				if (userData.music)
					await add(userData.music, messageReaction.message.channel, messageReaction.message.guild.members.cache.get(user.id));
			}
			return;
		}
		const music = messageReaction.client.music[messageReaction.message.guild.id];
		if (!(music.connection && music.connection.dispatcher && music.connection.channel.members.get(user.id)))
			return;
		if (messageReaction.emoji.name == emojis.previous || messageReaction.emoji.name == emojis.next) {
			if (!music.connection.dispatcher.paused) {
				if (messageReaction.emoji.name == emojis.previous) {
					music.playlist.splice(0, 0, music.now);
					if (music.repeat
						&& music.connection.dispatcher.streamTime < 10 * 1000) {
						const info = music.playlist.splice(music.playlist.length - 1, 1)[0];
						music.playlist.splice(0, 0, info);
					}
					music.now = null;
				}
				music.connection.dispatcher.emit('finish');
			}
			return;
		} else if (messageReaction.emoji.name == emojis.pause) {
			if (music.connection.voice.serverMute)
				return;
			const dispatcher = music.connection.dispatcher;
			if (dispatcher.paused) {
				dispatcher.resume();
				dispatcher.streams.opus.resume();
				await music.connection.voice.setSelfMute(false);
			} else {
				dispatcher.pause();
				await music.connection.voice.setSelfMute(true);
			}
		} else if (messageReaction.emoji.name == emojis.pageup || messageReaction.emoji.name == emojis.pagedown) {
			if (messageReaction.emoji.name == emojis.pageup && music.page > 0)
				music.page--;
			else if (messageReaction.emoji.name == emojis.pagedown && mmusic.playlist.length > (mmusic.page + 1) * max.page)
				music.page++;
			else
				return;
		} else if (messageReaction.emoji.name == emojis.save || messageReaction.emoji.name == emojis.free) {
			const userData = messageReaction.client.utils.readFile(`users/${user.id}.json`);
			if (!userData.music)
				userData.music = [];
			const id = music.now.id;
			let key;
			if (messageReaction.emoji.name == emojis.save && !userData.music.includes(id)) {
				if (userData.music.length >= max.video) {
					const send = await messageReaction.client.utils.sendMessage(messageReaction.message.channel, 'error_full');
					send.delete({ timeout: 10 * 1000 });
					return;
				}
				userData.music.push(id);
				key = 'music_add';
			} else if (messageReaction.emoji.name == emojis.free && userData.music.includes(id)) {
				userData.music.splice(userData.music.indexOf(id), 1);
				key = 'music_remove';
			} else
				return;
			messageReaction.client.utils.savFile(`users/${user.id}.json`, userData);
			const send = await messageReaction.client.utils.sendMessage(messageReaction.message.channel, key);
			send.delete({ timeout: 10 * 1000 });
			return;
		} else if (messageReaction.emoji.name == emojis.own)
			return;
		else
			for (const key of Object.keys(emojis))
				if (messageReaction.emoji.name == emojis[key])
					music[key] = !music[key];
		await updateMessage(messageReaction.client, messageReaction.message.guild.id);
	},
	messageDelete: async (message) => {
		if (message.channel.type == 'dm' || !message.channel.permissionsFor(message.client.user).has(['ADD_REACTIONS', 'SEND_MESSAGES']))
			return;
		const guildData = message.client.utils.readFile(`guilds/${message.guild.id}.json`);
		if (!(guildData.music && message.id == guildData.music.message))
			return;
		message = await message.client.utils.sendEmbed(message.channel, waitingembed(message.client, message.channel));
		guildData.music.message = message.id;
		message.client.utils.savFile(`guilds/${message.guild.id}.json`, guildData);
		for (const emoji of Object.values(emojis)) {
			if (message.deleted)
				return;
			await message.react(emoji).catch(() => { });
		}
		if (message.client.music && message.client.music[message.guild.id])
			await updateMessage(message.client, message.guild.id);
	},
	voiceStateUpdate: async (oldState, newState) => {
		if (!(newState.id == newState.guild.me.user.id
			&& newState.serverMute != oldState.serverMute
			&& newState.client.music
			&& newState.client.music[newState.guild.id]))
			return;
		const music = newState.client.music[newState.guild.id];
		if (!(music.connection && music.connection.dispatcher))
			return;
		if (newState.serverMute) {
			if (music.connection.dispatcher.paused)
				return;
			music.connection.dispatcher.pause();
			await music.connection.voice.setSelfMute(true);
		} else if (music.connection.dispatcher.paused) {
			music.connection.dispatcher.resume();
			music.connection.dispatcher.streams.opus.resume();
			await music.connection.voice.setSelfMute(false);
		} else
			return;
		await updateMessage(newState.client, newState.guild.id);
	},
	ready: async (client) => {
		setInterval(() => {
			for (const key of Object.keys(cache))
				delete cache[key];
		}, 1000 * 60 * 60);
		for (const guild of client.guilds.cache.values()) {
			const guildData = client.utils.readFile(`guilds/${guild.id}.json`);
			if (!guildData.music)
				continue;
			const channel = guild.channels.cache.get(guildData.music.channel);
			if (!(channel && channel.permissionsFor(client.user).has(['READ_MESSAGE_HISTORY', 'MANAGE_MESSAGES'])))
				continue;
			const minimumtime = Date.now() - 2 * 7 * 24 * 60 * 60 * 1000;
			while (1) {
				let removed = 0;
				const array = [];
				for (const message of (await channel.messages.fetch()).values())
					if (message.id != guildData.music.message)
						if (message.createdTimestamp <= minimumtime) {
							await message.delete();
							removed++;
						} else
							array.push(message);
				if (array.length)
					try {
						removed += (await channel.bulkDelete(array)).size;
						if (!removed)
							break;
					} catch { }
			}
			let message = await channel.messages.cache.get(guildData.music.message);
			if (!message) {
				if (!channel.permissionsFor(client.user).has(['ADD_REACTIONS', 'SEND_MESSAGES']))
					continue;
				message = await client.utils.sendEmbed(channel, waitingembed(client, channel));
				guildData.music.message = message.id;
				client.utils.savFile(`guilds/${guild.id}.json`, guildData);
				for (const emoji of Object.values(emojis)) {
					if (message.deleted)
						return;
					await message.react(emoji).catch(() => { });
				}
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
				await message.edit('', { embed: waitingembed(client, message.channel) });
			}
		delete client.music;
	}
};