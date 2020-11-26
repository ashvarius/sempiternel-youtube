const MessageEmbed = require('discord.js').MessageEmbed;
const url = require('url');
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
	if (client.music[guildId].playlist.length) {
		content += '\n';
		let index = 0;
		let video;
		while ((video = client.music[guildId].playlist[index++]))
			content += `\n${index} - [${video.videoDetails.title}](${video.videoDetails.video_url})`;
	}
	client.utils.replaceEmbed(message, new MessageEmbed({ description: content, thumbnail: client.music[guildId].now.videoDetails.thumbnail.thumbnails[client.music[guildId].now.videoDetails.thumbnail.thumbnails.length - 1] }));
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
		let video;
		try {
			video = await ytdl.getInfo(message.content);
		} catch (error) {
			const send = await message.client.utils.sendMessage(message.channel, 'error_api', { error: error.message });
			send.delete({ timeout: 10 * 1000 });
			return;
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
		video.request = message.member.user;
		const parsed = url.parse(message.content, true);
		if (parsed.query.t)
			video.seek = parsed.query.t * 1000;
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
				message.client.utils.replaceMessage(message1, 'music_watting');
			});
			message.client.music[message.guild.id].connection = connection;
		}
		message.client.music[message.guild.id].playlist.push(video);
		if (!message.client.music[message.guild.id].now)
			play(message.client, message.guild.id);
		else
			updateMessage(message.client, message.guild.id);
	},
	messageReactionAdd: (messageReaction, user) => {
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
	ready: async (client) => {
		for (const guild of client.guilds.cache.values()) {
			const guildData = client.utils.readFile(`guilds/${guild.id}.json`);
			if (!guildData.music)
				return;
			const channel = guild.channels.cache.get(guildData.music.channel);
			if (!channel)
				return;
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
			const message = channel.messages.cache.get(guildData.music.message);
			if (!message)
				return;
			for (const reaction of channel.messages.cache.get(guildData.music.message).reactions.cache.values())
				for (const user of (await reaction.users.fetch()).values())
					if (user != client.user)
						reaction.users.remove(user);
		}
	}
};