const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const ytpl = require('ytpl');
const scdl = require('soundcloud-downloader').create({ saveClientID: true });
const spotify = require('spotify-url-info');
const miniget = require('miniget');
const { URL } = require('url');
const googleTTS = require('google-tts-api');
const lyricsFinder = require('lyrics-finder');
const types = Object.freeze({
	youtube: 'youtube',
	soundcloud: 'soundcloud',
	spotify: 'spotify'
});
const colors = Object.freeze({
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
	own: '🪄',
	savefree: '🚩',
	pageup: '⤴️',
	pagedown: '⤵️',
	trash: '🗑️',
	bassboost: '🌋',
	autoplay: '📻',
	lyrics: '🪶'
});
const max = Object.freeze({
	page: 16,
	track: 50,
	update: 2,
	length: 64
});
const FFMPEG_ARGUMENTS_BASS = [
	'-af', 'bass=g=20,dynaudnorm'
];
const default_thumbnail = 'https://upload.wikimedia.org/wikipedia/commons/4/45/Michel_Richard_Delalande_engraving_BNF_Gallica.jpg';
let cache;

const generateYoutubeTrack = async (client, info) => {
	const video = await ytdl.getInfo(info.url, {
		requestOptions: {
			headers: {
				cookie: client.config['youtube-cookie']
			}
		}
	});
	let next = null;
	if (video.related_videos.length) {
		const url = new URL(video.videoDetails.video_url);
		url.searchParams.set('v', video.related_videos[0].id);
		next = url.toString();
	}
	if (video.videoDetails.isLiveContent)
		return;
	const format = ytdl.chooseFormat(video.formats, { filter: 'audioonly', quality: 'highestaudio' });
	let artist = video.videoDetails.author.name;
	if (artist.endsWith(' - Topic'))
		artist = artist.substring(0, artist.length - ' - Topic'.length);
	return {
		title: video.videoDetails.title,
		artist,
		url: video.videoDetails.video_url,
		thumbnail: video.videoDetails.thumbnails.reduce((a, b) => (a.width > b.width ? a : b)).url,
		next: {
			type: types.youtube,
			url: next
		},
		format: {
			url: format.url
		},
		expire: new URL(format.url).searchParams.get('expire') * 1000
	};
};

const generateSoundCloudTrack = async (info) => {
	const data = await scdl.getInfo(info.url);
	const url = new URL(data.media.transcodings[0].url);
	url.searchParams.set('client_id', await scdl.getClientID());
	const body = await miniget(url.toString()).text();
	const media = JSON.parse(body);
	return {
		title: data.title,
		artist: data.user.full_name,
		url: data.permalink_url,
		thumbnail: data.artwork_url,
		format: {
			url: media.url
		}
	};
};

const generateSpotifyTrack = async (client, info) => {
	const data = await spotify.getData(info.url);
	const artists = data.artists.map(artist => artist.name).join(' ');
	let filters = await ytsr.getFilters(`${artists} ${data.album.name} ${data.name}`);
	let filter = filters.get('Type').get('Video');
	filters = await ytsr.getFilters(filter.url);
	filter = filters.get('Features').get('HD');
	const search = await ytsr(filter.url, { limit: 1 });
	if (!search.items.length)
		return;
	const youtube = search.items[0].url;
	const video = await ytdl.getInfo(youtube, {
		requestOptions: {
			headers: {
				cookie: client.config['youtube-cookie']
			}
		}
	});
	let next = null;
	if (video.related_videos.length) {
		const url = new URL(video.videoDetails.video_url);
		url.searchParams.set('v', video.related_videos[0].id);
		next = url.toString();
	}
	if (video.videoDetails.isLiveContent)
		return;
	const format = ytdl.chooseFormat(video.formats, { filter: 'audioonly', quality: 'highestaudio' });
	return {
		title: data.name,
		artist: artists,
		url: data.external_urls.spotify,
		thumbnail: data.album.images.reduce((a, b) => (a.width > b.width ? a : b)).url,
		next: {
			type: types.youtube,
			url: next
		},
		format: {
			url: format.url
		},
		expire: new URL(format.url).searchParams.get('expire') * 1000
	};
};

const getTrack = async (client, info) => {
	let track;
	if (info.url)
		if (cache.get(`${info.type}_${info.url}`)) {
			track = cache.get(`${info.type}_${info.url}`);
			if (!track.expire || track.expire > Date.now())
				return track;
		}
	if (info.type == types.youtube)
		track = await generateYoutubeTrack(client, info);
	else if (info.type == types.soundcloud)
		track = await generateSoundCloudTrack(info);
	else if (info.type == types.spotify)
		track = await generateSpotifyTrack(client, info);
	else {
		const parsed = new URL(info.url);
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
	track.color = colors[info.type];
	if (track.title.length > max.length)
		track.title = `${track.title.substring(0, max.length - 3)}...`;
	track.title = track.title
		.replace(/\[/g, '{')
		.replace(/\]/g, '}')
		.replace(/\|/g, '/')
		.replace(/`/g, '\'')
		.replace(/\*/g, '+')
		.replace(/~/g, '-')
		.replace(/_/g, '-')
		.replace(/>/g, '-');
	cache.set(`${info.type}_${track.url}`, track);
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
	const guildData = await client.utils.readFile(client.utils.docRef.collection('guild').doc(guildId));
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
	if (!client.music[guildId])
		return;
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

const getLyrics = async (channel, artist, title) => {
	let lyrics = await lyricsFinder(artist, title);
	if (lyrics.length == 0)
		lyrics = channel.client.utils.getMessage(channel, 'error_not_find', { type: channel.client.utils.getMessage(channel, 'lyrics') });
	const lyrics_array = [];
	let content = '';
	for (const item of lyrics.split('\n')) {
		if (content.length + item.length >= 2048) {
			lyrics_array.push(content);
			content = '';
		} else if (content.length != 0 && content.length < 2048)
			content += '\n';
		content += item;
	}
	if (content.length)
		lyrics_array.push(content);
	return lyrics_array;
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
	let args = [];
	if (client.music[guildId].bassboost)
		args = FFMPEG_ARGUMENTS_BASS;
	const transcoder = client.utils.generateTranscoder(track.format.url, {
		start: info.time,
		args
	});
	await client.music[guildId].connection.voice.setSelfMute(false);
	let title = track.title;
	if (title.length > 32)
		title = title.substring(0, 32);
	const guild = await client.guilds.fetch(guildId);
	if (guild.me.hasPermission('CHANGE_NICKNAME'))
		await guild.me.setNickname(title);
	const dispatcher = client.utils.playTranscoder(client.music[guildId].connection.player, transcoder);
	dispatcher.on('finish', async () => {
		try {
			const guildData = await client.utils.readFile(client.utils.docRef.collection('guild').doc(guildId));
			const channel = client.guilds.cache.get(guildId).channels.cache.get(guildData.music.channel);
			if (client.music[guildId].lyrics && channel) {
				const lyrics_message = channel.messages.cache.get(client.music[guildId].lyrics && client.music[guildId].lyrics.message);
				if (lyrics_message)
					lyrics_message.delete();
				delete client.music[guildId].lyrics;
			}
			await client.music[guildId].connection.voice.setSelfMute(true);
			if (!Array.from(client.music[guildId].connection.channel.members.values()).filter(member => !member.user.bot).length) {
				client.music[guildId].connection.disconnect();
				return;
			}
			if (client.music[guildId].now
				&& (client.music[guildId].repeat || client.music[guildId].autoplay)) {
				if (channel)
					if (client.music[guildId].repeat) {
						if (info.time != null)
							delete info.time;
						await add([info], channel, null, true);
					} else if (client.music[guildId].autoplay && !client.music[guildId].playlist.length) {
						if (track.next)
							await add([track.next], channel, null, true);
					}
			}
			await play(client, guildId);
		} catch (error) {
			client.logger.log('error', error);
		}
	});
	if (!client.music[guildId])
		return;
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
		if (info.time == null) {
			if (info.url)
				try {
					info.time = new URL(info.url).searchParams.get('t');
					// eslint-disable-next-line no-empty
				} catch { }
			if (info.time == null)
				info.time = 0;
		}
		try {
			const track = await getTrack(channel.client, info);
			if (!track)
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
			channel.client.music[guild.id].nickname = guild.me.nickname;
			channel.client.music[guild.id].playlist = [];
			channel.client.music[guild.id].page = 0;
		}
		if (!channel.client.music[guild.id].connection) {
			const connection = guild.me.voice.connection;
			if (!connection)
				return;
			connection.on('disconnect', async () => {
				try {
					if (!guild.client.music)
						return;
					const nickname = guild.client.music[guild.id].nickname;
					delete guild.client.music[guild.id];
					if (guild.me.hasPermission('CHANGE_NICKNAME'))
						guild.me.setNickname(nickname);
					const guildData = await guild.client.utils.readFile(guild.client.utils.docRef.collection('guild').doc(guild.id));
					const channel = guild.channels.cache.get(guildData.music.channel);
					if (!channel)
						return;
					const message = channel.messages.cache.get(guildData.music.message);
					if (message)
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
	description: 'description_music',
	permissions: ['MANAGE_CHANNELS', 'ADD_REACTIONS', 'VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES', 'READ_MESSAGE_HISTORY', 'CONNECT', 'SPEAK', 'CHANGE_NICKNAME'],
	command: async object => {
		const guildData = await object.client.utils.readFile(object.client.utils.docRef.collection('guild').doc(object.guild.id));
		if (guildData.music && object.guild.channels.cache.get(guildData.music.channel)) {
			object.client.utils.sendMessage(object.channel, 'error_channel_exists');
			return;
		}
		const channel = await object.guild.channels.create('Music', {
			type: 'text',
			topic: 'This channel is designed to handle music.',
			parent: object.channel.parent,
			permissionOverwrites: [
				{
					id: object.guild.me.id,
					allow: ['ADD_REACTIONS', 'VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES', 'READ_MESSAGE_HISTORY']
				}
			],
			rateLimitPerUser: 5,
			reason: 'Create a music channel'
		});
		const message = await object.client.utils.sendEmbed(channel, waitingEmbed(object.client, channel), true);
		guildData.music = {
			channel: channel.id,
			message: message.id
		};
		object.client.utils.savFile(object.client.utils.docRef.collection('guild').doc(object.guild.id), guildData);
		for (const emoji of Object.values(emojis))
			message.react(emoji);
		return object.client.utils.getMessage(object.channel, 'music_success');
	},
	permission: object => {
		if (!object.member.hasPermission('ADMINISTRATOR'))
			return false;
		return true;
	},
	protect: async channel => {
		if (channel.type == 'dm')
			return;
		const guildData = await channel.client.utils.readFile(channel.client.utils.docRef.collection('guild').doc(channel.guild.id));
		return channel.id == (guildData.music && guildData.music.channel);
	},
	message: async message => {
		if (message.author.id == message.client.user.id
				|| message.channel.type == 'dm')
			return;
		const guildData = await message.client.utils.readFile(message.client.utils.docRef.collection('guild').doc(message.guild.id));
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
					infos.push({ type: types.youtube, url: item.shortUrl });
			} else if (scdl.isValidUrl(message.content)) {
				try {
					const info = await scdl.getSetInfo(message.content);
					for (const track of info.tracks)
						infos.push({
							type: types.soundcloud,
							url: track.permalink_url
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
							url: info.external_urls.spotify
						});
					else if (info.type == 'album')
						for (const track of info.tracks.items)
							infos.push({
								type: types.spotify,
								url: track.external_urls.spotify
							});
					else if (info.type == 'playlist')
						for (const item of info.tracks.items)
							infos.push({
								type: types.spotify,
								url: item.track.external_urls.spotify
							});
					else return;
				} catch {
					infos.push({
						url: message.content
					});
				}
			}
		} catch (error) {
			if (message.content.startsWith('tts '))
				try {
					infos.push({
						url: googleTTS.getAudioUrl(message.content.substring(4), { lang: message.client.config.language })
					});
				} catch (error) {
					const send = await channel.client.utils.sendMessage(channel, 'error_api', { error: error.message });
					send.delete({ timeout: 10 * 1000 });
				}
			else {
				if (!message.content.length)
					return;
				let filters = await ytsr.getFilters(message.content);
				let filter = filters.get('Type').get('Video');
				filters = await ytsr.getFilters(filter.url);
				filter = filters.get('Features').get('HD');
				const search = await ytsr(filter.url, { limit: 1 });
				if (!search.items.length)
					return;
				infos.push({ type: types.youtube, url: search.items[0].url });
			}
		}
		await add(infos, message.channel, message.member);
	},
	messageReactionAdd: async (messageReaction, user) => {
		if (user.id == messageReaction.client.user.id)
			return;
		const guildData = await messageReaction.client.utils.readFile(messageReaction.client.utils.docRef.collection('guild').doc(messageReaction.message.guild.id));
		if (guildData.music == null)
			return;
		const channel = messageReaction.message.guild.channels.cache.get(guildData.music.channel);
		if (!channel)
			return;
		const music = messageReaction.client.music && messageReaction.client.music[messageReaction.message.guild.id];
		if (music && music.lyrics)
		{
			const id = music.lyrics && music.lyrics.message;
			if (messageReaction.message.id == id) {
				messageReaction.users.remove(user);
				const lyrics_message = channel.messages.cache.get(id);
				if (lyrics_message != null) {
					messageReaction.users.remove(user);
					if (messageReaction.emoji.name == emojis.pageup && music.lyrics.page > 0)
						music.lyrics.page--;
					else if (messageReaction.emoji.name == emojis.pagedown && music.lyrics.page < music.lyrics.text.length - 1)
						music.lyrics.page++;
					else
						return;
					lyrics_message.edit(messageReaction.client.utils.createEmbed(music.lyrics.text[music.lyrics.page]));
					return;
				}
			}
		}
		if (messageReaction.message.id != guildData.music.message)
			return;
		messageReaction.users.remove(user);
		if (!(messageReaction.client.music && messageReaction.client.music[messageReaction.message.guild.id])) {
			if (messageReaction.emoji.name == emojis.own) {
				const userData = await messageReaction.client.utils.readFile(messageReaction.client.utils.docRef.collection('user').doc(user.id));
				if (userData.music && userData.music.length)
					await add(userData.music, messageReaction.message.channel, messageReaction.message.guild.members.cache.get(user.id));
			}
			return;
		}
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
		} else if (messageReaction.emoji.name == emojis.savefree) {
			const userData = await messageReaction.client.utils.readFile(messageReaction.client.utils.docRef.collection('user').doc(user.id));
			if (!userData.music)
				userData.music = [];
			const info = music.now;
			delete info.time;
			let key;
			if (userData.music.some(item => item.url == info.url)) {
				for (const index of userData.music.keys())
					if (userData.music[index].url == info.url)
						userData.music.splice(index, 1);
				key = 'music_remove';
			} else {
				if (userData.music.length >= max.track) {
					const send = await messageReaction.client.utils.sendMessage(messageReaction.message.channel, 'error_full');
					send.delete({ timeout: 10 * 1000 });
					return;
				}
				userData.music.push(info);
				key = 'music_add';
			}
			messageReaction.client.utils.savFile(messageReaction.client.utils.docRef.collection('user').doc(user.id), userData);
			const send = await messageReaction.client.utils.sendMessage(messageReaction.message.channel, key);
			send.delete({ timeout: 10 * 1000 });
			return;
		} else if (messageReaction.emoji.name == emojis.trash) {
			music.connection.disconnect();
			return;
		} else if (messageReaction.emoji.name == emojis.lyrics) {
			const info = music.now;
			const track = await getTrack(messageReaction.client, info);
			const lyrics = await getLyrics(channel, track.artist, track.title);
			const message = await channel.send(messageReaction.client.utils.createEmbed(lyrics[0]));
			messageReaction.client.music[messageReaction.message.guild.id].lyrics = {
				message: message.id,
				text: lyrics,
				page: 0
			};
			message.react(emojis.pageup);
			message.react(emojis.pagedown);
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
		const guildData = await message.client.utils.readFile(message.client.utils.docRef.collection('guild').doc(message.guild.id));
		if (!(guildData.music && message.id == guildData.music.message))
			return;
		message = await message.client.utils.sendEmbed(message.channel, waitingEmbed(message.client, message.channel), true);
		guildData.music.message = message.id;
		message.client.utils.savFile(message.client.utils.docRef.collection('guild').doc(message.guild.id), guildData);
		for (const emoji of Object.values(emojis)) {
			if (message.deleted)
				return;
			await message.react(emoji);
		}
		if (message.client.music && message.client.music[message.guild.id])
			await updateMessage(message.client, message.guild.id);
	},
	voiceStateUpdate: async (oldState, newState) => {
		if (!(newState.client.music
			&& newState.client.music[newState.guild.id]))
			return;
		if (newState.id != newState.guild.me.user.id
			&& oldState.channelID != newState.channelID
			&& oldState.channelID == newState.client.music[newState.guild.id].connection.channel.id
			&& newState.client.music[newState.guild.id].connection.dispatcher.paused
			&& !Array.from(newState.client.music[newState.guild.id].connection.channel.members.values()).filter(member => !member.user.bot).length) {
			newState.client.music[newState.guild.id].connection.disconnect();
			return;
		}
		if (!(newState.id == newState.guild.me.user.id
			&& newState.serverMute != oldState.serverMute))
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
	ready: async client => {
		cache = client.utils.createCache();
		for (const guild of client.guilds.cache.values()) {
			const guildData = await client.utils.readFile(client.utils.docRef.collection('guild').doc(guild.id));
			if (!guildData.music)
				continue;
			const channel = await client.channels.fetch(guildData.music.channel).catch(() => { });
			if (!channel) {
				delete guildData.music;
				client.utils.savFile(client.utils.docRef.collection('guild').doc(guild.id), guildData);
				continue;
			}
			if (!channel.permissionsFor(client.user).has(['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY', 'MANAGE_MESSAGES']))
				continue;
			const minimumTime = Date.now() - 2 * 7 * 24 * 60 * 60 * 1000;
			let removed;
			do {
				removed = 0;
				const array = [];
				for (const message of (await channel.messages.fetch()).values())
					if (message.id != guildData.music.message)
						if (message.createdTimestamp <= minimumTime) {
							await message.delete();
							removed++;
						} else
							array.push(message);
				if (array.length)
					removed += await channel.bulkDelete(array).then(data => data.size).catch(() => { });
			} while (removed);
			let message = await channel.messages.fetch(guildData.music.message).catch(() => { });
			if (message != null) {
				let deleted = false;
				for (const emoji of Object.values(emojis))
					if (message.reactions.cache.find(reaction => reaction.emoji.name == emoji) == null) {
						await message.delete();
						deleted = true;
						break;
					}
				if (deleted)
					continue;
			}
			if (message == null) {
				if (!channel.permissionsFor(client.user).has(['ADD_REACTIONS', 'SEND_MESSAGES']))
					continue;
				message = await client.utils.sendEmbed(channel, waitingEmbed(client, channel), true);
				guildData.music.message = message.id;
				client.utils.savFile(client.utils.docRef.collection('guild').doc(guild.id), guildData);
				for (const emoji of Object.values(emojis)) {
					if (message.deleted)
						return;
					message.react(emoji).catch(() => { });
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
				if (guild.me.hasPermission('CHANGE_NICKNAME'))
					await guild.me.setNickname(guild.client.music[guild.id].nickname);
				const guildData = await client.utils.readFile(client.utils.docRef.collection('guild').doc(guild.id));
				const channel = guild.channels.cache.get(guildData.music.channel);
				if (!channel)
					return;
				const message = channel.messages.cache.get(guildData.music.message);
				if (message)
					await client.utils.replaceEmbed(message, waitingEmbed(client, channel));
				const lyrics_message = channel.messages.cache.get(guild.client.music[guild.id].lyrics && guild.client.music[guild.id].lyrics.message);
				if (lyrics_message)
					await lyrics_message.delete();
			}
		delete client.music;
	}
};