const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const ytpl = require('ytpl');
const spotify = require('spotify-url-info');
const scdl = require('soundcloud-downloader').create({ saveClientID: true });
const miniget = require('miniget');
const url = require('url');
const types = Object.freeze({
	youtube: '#FF0000',
	soundcloud: '#F48220',
	spotify: '#1DB954'
});
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
	track: 50,
	update: 2,
	bitrate: 48
});
const FFMPEG_ARGUMENTS = [
	'-af', 'bass=g=20,dynaudnorm'
];
const default_thumbnail = 'https://upload.wikimedia.org/wikipedia/commons/4/45/Michel_Richard_Delalande_engraving_BNF_Gallica.jpg';
let cache;

const generateYoutubeTrack = async (client, info) => {
	const video = await ytdl.getInfo(info.id ? info.id : info.url, {
		requestOptions: {
			headers: {
				cookie: client.config['youtube-cookie']
			}
		}
	});
	if (video.videoDetails.isLiveContent)
		return;
	const format = ytdl.chooseFormat(video.formats, { filter: 'audioonly', quality: 'highestaudio' });
	return {
		title: video.videoDetails.title,
		url: video.videoDetails.video_url,
		id: video.videoDetails.videoId,
		thumbnail: video.videoDetails.thumbnails.reduce((a, b) => (a.width > b.width ? a : b)).url,
		next: video.related_videos.length && video.related_videos[Math.floor(Math.random() * video.related_videos.length)].id,
		format: {
			url: format.url
		},
		expire: url.parse(format.url, true).query.expire * 1000
	};
};

const generateSoundCloudTrack = async (info) => {
	const data = await scdl.getInfo(info.url);
	const parsed = url.parse(data.media.transcodings[0].url);
	parsed.query = {
		client_id: await scdl.getClientID()
	};
	const body = await miniget(url.format(parsed)).text();
	const media = JSON.parse(body);
	return {
		title: data.title,
		url: data.permalink_url,
		id: data.id,
		thumbnail: data.artwork_url,
		format: {
			url: media.url
		}
	};
};

const generateSpotifyTrack = async (info) => {
	const data = await spotify.getData(info.url);
	return {
		title: data.name,
		url: data.external_urls.spotify,
		id: data.id,
		thumbnail: data.album.images.reduce((a, b) => (a.width > b.width ? a : b)).url,
		format: {
			url: data.preview_url
		}
	};
};

const getTrack = async (client, info) => {
	let track;
	if (info.id)
		if (cache.get(`${info.type}_${info.id}`)) {
			track = cache.get(`${info.type}_${info.id}`);
			if (track.expire && track.expire > Date.now())
				return track;
		}
	if (info.type == types.youtube)
		track = await generateYoutubeTrack(client, info);
	else if (info.type == types.soundcloud)
		track = await generateSoundCloudTrack(info);
	else if (info.type == types.spotify)
		track = await generateSpotifyTrack(info);
	else {
		const parsed = url.parse(info.url);
		const filename = parsed.pathname.substring(parsed.pathname.lastIndexOf('/') + 1);
		track = {
			title: filename,
			thumbnail: default_thumbnail,
			url: info.url,
			format: {
				url: info.url
			}
		};
	}
	if (!track)
		return;
	track.color = info.type;
	if (track.title.length > 50)
		track.title = `${track.title.substring(0, 50)}...`;
	track.title = track.title
		.replace(/\[/g, '{')
		.replace(/\]/g, '}')
		.replace(/\|/g, '/')
		.replace(/`/g, '\'')
		.replace(/\*/g, '+')
		.replace(/~/g, '-')
		.replace(/_/g, '-')
		.replace(/>/g, '-');
	cache.set(`${info.type}_${track.id}`, track);
	return track;
};

const waitingEmbed = (client, channel) => {
	let description = `${client.utils.getMessage(channel, 'music_watting')}\n`;
	for (const key of Object.keys(emojis))
		description += `\n${emojis[key]} ${client.utils.getMessage(channel, `music_reaction_${key}`)}`;
	return client.utils.createEmbed(description);
};

const updateMessage = async (client, guildId) => {
	if (!client.music[guildId])
		return;
	const guildData = client.utils.readFile(`guilds/${guildId}.json`);
	const channel = client.guilds.cache.get(guildId).channels.cache.get(guildData.music.channel);
	if (!channel)
		return;
	const message = await channel.messages.fetch(guildData.music.message);
	if (!message)
		return;
	const options = [];
	for (const key of Object.keys(emojis))
		if (client.music[guildId][key])
			options.push(client.utils.getMessage(message.channel, key));
	let content = client.music[guildId].connection.dispatcher && client.music[guildId].connection.dispatcher.paused ? '⏸️' : '▶️';
	if (options.length)
		content += `\n${client.utils.getMessage(message.channel, 'activate')}: ${options.join(', ')}\n`;
	const now = await getTrack(client, client.music[guildId].now);
	if (!client.music[guildId])
		return;
	content += `\n${client.utils.getMessage(message.channel, 'now')} - [${now.title}](${now.url})`;
	if (client.music[guildId].playlist.length) {
		content += '\n';
		const min = client.music[guildId].page * max.page;
		let index = 0;
		let info;
		while (client.music[guildId] && (info = client.music[guildId].playlist[index++]))
			if (index > min && index <= min + max.page) {
				const track = await getTrack(client, info);
				content += `\n${index} - [${track.title}](${track.url})`;
			}
	}
	const send = async () => {
		if (!client.music[guildId])
			return;
		client.music[guildId].embed = { content, last: 0 };
		const embed = client.utils.createEmbed(content);
		embed.setThumbnail(now.thumbnail);
		embed.setColor(now.color);
		const sent = await client.utils.replaceEmbed(message, embed);
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
	const track = await getTrack(client, info);
	const transcoder = client.utils.generateTranscoder(track.format.url, {
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
					if (client.music[guildId].repeat) {
						if (info.time)
							delete info.time;
						await add([info], channel, null, true);
					} else if (client.music[guildId].autoplay && !client.music[guildId].playlist.length) {
						if (track.next)
							await add([{
								type: info.type,
								id: track.next
							}], channel, null, true);
					}
			}
			await play(client, guildId);
		} catch (error) {
			client.logger.log('error', error);
		}
	});
	if (client.music[guildId].connection.voice.serverMute) {
		client.music[guildId].connection.dispatcher.pause();
		await client.music[guildId].connection.voice.setSelfMute(true);
	}
	await updateMessage(client, guildId);
};

const add = async (infos, channel, member, silence = false) => {
	const guild = channel.guild;
	for (let info of infos) {
		if (!silence
			&& channel.client.music
			&& channel.client.music[guild.id]
			&& channel.client.music[guild.id].playlist.length >= max.track) {
			const send = await channel.client.utils.sendMessage(channel, 'error_full');
			send.delete({ timeout: 10 * 1000 });
			break;
		}
		if (!info.time) {
			if (info.url)
				try {
					info.time = url.parse(info.url, true).query.t;
					// eslint-disable-next-line no-empty
				} catch { }
			if (!info.time)
				info.time = 0;
		}
		try {
			const track = await getTrack(channel.client, info);
			if (!track)
				continue;
			if (!info.id)
				info.id = track.id;
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
					channel.client.utils.replaceEmbed(message, waitingEmbed(channel.client, channel));
				} catch (error) {
					channel.client.logger.log('error', error);
				}
			});
			channel.client.music[guild.id].connection = connection;
		}
		channel.client.music[guild.id].playlist.push(info);
		while (channel.client.music[guild.id].playlist.length > (channel.client.music[guild.id].page + 1) * max.page)
			channel.client.music[guild.id].page++;
		if (!channel.client.music[guild.id].now)
			await play(channel.client, guild.id);
		else if (!silence)
			await updateMessage(guild.client, guild.id);
	}
};

module.exports = {
	name: 'music',
	aliases: [],
	description: 'description_music',
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
		const message = await command.message.client.utils.sendEmbed(channel, waitingEmbed(command.message.client, channel));
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
	protect: (channel) => {
		if (channel.type == 'dm')
			return;
		const guildData = channel.client.utils.readFile(`guilds/${channel.guild.id}.json`);
		if (!guildData.music)
			return;
		return channel.id == (guildData.music && guildData.music.channel);
	},
	message: async (message) => {
		if (message.channel.type == 'dm' || message.author.id == message.client.user.id)
			return;
		const guildData = message.client.utils.readFile(`guilds/${message.guild.id}.json`);
		if (!guildData.music)
			return;
		const channel = message.guild.channels.cache.get(guildData.music.channel) || {};
		if (!(channel.id == message.channel.id && channel.permissionsFor(message.guild.me).has('MANAGE_MESSAGES')))
			return;
		if (message.deleted)
			return;
		await message.delete();
		if (message.author.bot)
			return;
		let infos = [];
		try {
			new URL(message.content);
			if (ytdl.validateURL(message.content)) {
				infos.push({
					type: types.youtube,
					url: message.content
				});
			} else if (ytpl.validateID(message.content)) {
				const playlist = await ytpl(message.content);
				for (const item of playlist.items)
					infos.push({ type: types.youtube, id: item.id });
			} else if (scdl.isValidUrl(message.content)) {
				try {
					const info = await scdl.getSetInfo(message.content);
					for (const track of info.tracks)
						infos.push({
							type: types.soundcloud,
							url: track.permalink_url,
							id: track.id
						});
				} catch {
					infos.push({
						type: types.soundcloud,
						url: message.content
					});
				}
			} else {
				try {
					const info = await spotify.getData(message.content);
					if (info.type == 'track')
						infos.push({
							type: types.spotify,
							url: info.external_urls.spotify,
							id: info.id
						});
					else if (info.type == 'album')
						for (const track of info.tracks.items)
							infos.push({
								type: types.spotify,
								url: track.external_urls.spotify,
								id: track.id
							});
					else return;
				} catch {
					infos.push({
						url: message.content
					});
				}
			}
		} catch (error) {
			const filters = await ytsr.getFilters(message.content);
			const filter = filters.get('Type').get('Video');
			if (!filter.url)
				return;
			const search = await ytsr(filter.url, { limit: 1 });
			if (!search.items.length)
				return;
			infos.push({ type: types.youtube, id: search.items[0].id });
		}
		await add(infos, message.channel, message.member);
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
				if (userData.music && userData.music.length) {
					if (typeof userData.music[0] == 'string') {
						userData.music = userData.music.map(item => {
							if (typeof item == 'string')
								return { type: types.youtube, id: item };
							return item;
						});
						messageReaction.client.utils.savFile(`users/${user.id}.json`, userData);
					}
					await add(userData.music, messageReaction.message.channel, messageReaction.message.guild.members.cache.get(user.id));
				}
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
			else if (messageReaction.emoji.name == emojis.pagedown && music.playlist.length > (music.page + 1) * max.page)
				music.page++;
			else
				return;
		} else if (messageReaction.emoji.name == emojis.save || messageReaction.emoji.name == emojis.free) {
			const userData = messageReaction.client.utils.readFile(`users/${user.id}.json`);
			if (!userData.music)
				userData.music = [];
			const info = music.now;
			if (info.time)
				delete info.time;
			let key;
			if (messageReaction.emoji.name == emojis.save && !userData.music.includes(info)) {
				if (userData.music.length >= max.track) {
					const send = await messageReaction.client.utils.sendMessage(messageReaction.message.channel, 'error_full');
					send.delete({ timeout: 10 * 1000 });
					return;
				}
				userData.music.push(info);
				key = 'music_add';
			} else if (messageReaction.emoji.name == emojis.free && userData.music.includes(info)) {
				userData.music.splice(userData.music.indexOf(info), 1);
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
		message = await message.client.utils.sendEmbed(message.channel, waitingEmbed(message.client, message.channel));
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
		cache = client.utils.createCache(500);
		for (const guild of client.guilds.cache.values()) {
			const guildData = client.utils.readFile(`guilds/${guild.id}.json`);
			if (!guildData.music)
				continue;
			const channel = guild.channels.cache.get(guildData.music.channel);
			if (!(channel && channel.permissionsFor(client.user).has(['READ_MESSAGE_HISTORY', 'MANAGE_MESSAGES'])))
				continue;
			const minimumtime = Date.now() - 2 * 7 * 24 * 60 * 60 * 1000;
			let removed = 0;
			do {
				const array = [];
				for (const message of (await channel.messages.fetch()).values())
					if (message.id != guildData.music.message)
						if (message.createdTimestamp <= minimumtime) {
							await message.delete();
							removed++;
						} else
							array.push(message);
				if (array.length) {
					removed += await channel.bulkDelete(array).then(data => data.size).catch(() => { });
				}
			} while (removed);
			let message = await channel.messages.fetch(guildData.music.message);
			if (!message) {
				if (!channel.permissionsFor(client.user).has(['ADD_REACTIONS', 'SEND_MESSAGES']))
					continue;
				message = await client.utils.sendEmbed(channel, waitingEmbed(client, channel));
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
				await client.utils.replaceEmbed(message, waitingEmbed(client, channel));
			}
		delete client.music;
	}
};