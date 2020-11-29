const ytdl = require('discord-ytdl-core');
const emojis = {
	random: '🔀',
	previous: '⏮️',
	pause: '⏯️',
	next: '⏭️',
	repeat: '🔁',
	pageup: '⤴️',
	pagedown: '⤵️',
	own: '📃',
	save: '📥',
	free: '📤'
};
const max = 16;

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
		const min = client.music[guildId].page * max;
		let index = 0;
		let video;
		while ((video = client.music[guildId].playlist[index++])) {
			if (index > min && index <= min + max)
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

const add = async (ids, channel, member) => {
	const guild = channel.guild;
	for (let id of ids) {
		let video;
		try {
			video = await ytdl.getInfo(id);
		} catch (error) {
			const send = await channel.client.utils.sendMessage(channel, 'error_api', { error: error.message });
			send.delete({ timeout: 10 * 1000 });
			break;
		}
		if (!guild.me.voice.channelID) {
			const channel = await guild.channels.cache.get(member.voice.channelID);
			if (!(channel && channel.joinable))
				return;
			await channel.join();
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
			connection.on('disconnect', () => {
				delete guild.client.music[guild.id];
				const guildData = channel.client.utils.readFile(`guilds/${guild.id}.json`);
				const channel = guild.channels.cache.get(guildData.music.channel);
				if (!channel)
					return;
				const message = channel.messages.cache.get(guildData.music.message);
				if (!message)
					return;
				message.edit('', { embed: channel.client.utils.createEmbed(channel.client.utils.getMessage(channel, 'music_watting')) });
			});
			channel.client.music[guild.id].connection = connection;
		}
		if (video.videoDetails.title.length > 50)
			video.videoDetails.title = `${video.videoDetails.title.substring(0, 50)}...`;
		video.videoDetails.title = video.videoDetails.title.replace(/\[|\]/g, '|');
		channel.client.music[guild.id].playlist.push(video);
		while (channel.client.music[guild.id].playlist.length > (channel.client.music[guild.id].page + 1) * max)
			channel.client.music[guild.id].page++;
		if (!channel.client.music[guild.id].now)
			play(channel.client, guild.id);
		else
			updateMessage(guild.client, guild.id);
	}
}

module.exports = {
	name: 'music',
	aliases: [],
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
	message: (message) => {
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
		add(ids, message.channel, message.member);
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
					add(userData.music, messageReaction.message.channel, messageReaction.message.guild.members.cache.get(user.id));
			}
			return;
		}
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
				dispatcher.pause(true);
		} else if (messageReaction.emoji.name == emojis.pageup || messageReaction.emoji.name == emojis.pagedown) {
			if (messageReaction.emoji.name == emojis.pageup && messageReaction.client.music[messageReaction.message.guild.id].page > 0)
				messageReaction.client.music[messageReaction.message.guild.id].page--;
			else if (messageReaction.emoji.name == emojis.pagedown && messageReaction.client.music[messageReaction.message.guild.id].playlist.length > (messageReaction.client.music[messageReaction.message.guild.id].page + 1) * max)
				messageReaction.client.music[messageReaction.message.guild.id].page++;
			else
				return;
			updateMessage(messageReaction.client, messageReaction.message.guild.id);
		} else if (messageReaction.emoji.name == emojis.save || messageReaction.emoji.name == emojis.free) {
			const userData = messageReaction.client.utils.readFile(`users/${user.id}.json`);
			if (!userData.music)
				userData.music = [];
			const id = messageReaction.client.music[messageReaction.message.guild.id].now.videoDetails.videoId;
			let key;
			if (messageReaction.emoji.name == emojis.save && !userData.music.includes(id)) {
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
		if (message.client.music && message.client.music[message.guild.id])
			updateMessage(message.client, message.guild.id);
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