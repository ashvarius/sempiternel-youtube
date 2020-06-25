/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   play.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 17:32:55 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/25 19:40:41 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');
const YoutubeVideo = require('../../youtube-wrapper/index.js').Video;
const prism = require('prism-media');

const generateOpus = url => {
	const transcoder = new prism.FFmpeg({
		args: [
			'-i', url,
			'-f', 's16le',
			'-ar', '48000',
			'-ac', 2,
			'-preset', 'ultrafast'
		]
	});
	return transcoder.pipe(new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 48 * 20 }));
}
const start = async (client, guildId) => {
	if (!client.music[guildId])
		return;
	if (!client.music[guildId].playlist.length) {
		client.music[guildId].connection.disconnect();
		return;
	}
	const music = client.music[guildId].playlist[0];
	if (music.expires - parseInt(music.lengthSeconds) <= Date.now()) {
		await music.fetch();
		if (music.status
			|| !(music.formats && music.formats.length)) {
			client.music[guildId].playlist.splice(client.music[guildId].playlist.indexOf(music), 1);
			await start(client, guildId);
			return;
		}
	}
	const format = music.formats.find(format => !format.qualityLabel && format.audioChannels);
	const opus = generateOpus(format.url);
	const dispatcher = client.music[guildId].connection.player.createDispatcher({
		type: 'opus',
		fec: true,
		bitrate: 'auto',
		highWaterMark: 1 << 25
	}, { opus });
	opus.pipe(dispatcher);
	dispatcher.on('finish', async () => {
		dispatcher.destroy();
		if (!Array.from(client.music[guildId].connection.channel.members.values()).filter(member => !member.user.bot).length) {
			client.music[guildId].connection.disconnect();
			return;
		}
		if (!client.music[guildId].loop) {
			const deleted = client.music[guildId].playlist.splice(client.music[guildId].playlist.indexOf(music), 1);
			if (client.music[guildId].loopqueue)
				client.music[guildId].playlist.push(deleted[0]);
			else if (client.music[guildId].autoplay && !client.music[guildId].playlist.length && deleted[0].next) {
				const next = await new YoutubeVideo(deleted[0].next).fetch();
				if (!next.status
					&& !(next.liveBroadcastDetails && next.liveBroadcastDetails.isLiveNow)
					&& next.formats && next.formats.length) {
					next.request = 'AutoPlay';
					client.music[guildId].playlist.push(next);
				}
			}
		}
		if (!client.music[guildId].playlist.length)
			client.music[guildId].connection.disconnect();
		else
			await start(client, guildId);
	});
};

const play = async (member, client, channel, guild, dictionary, url) => {
	if (!member.voice.channelID) {
		utils.sendMessage(channel, dictionary, 'error_play_no_voice');
		return;
	}
	if (guild.me.voice.channelID && member.voice.channelID != guild.me.voice.channelID) {
		utils.sendMessage(channel, dictionary, 'error_play_not_same_voice');
		return;
	}
	const sendedMessage = await utils.sendMessage(channel, dictionary, 'play_loading');
	const music = await new YoutubeVideo(url).fetch();
	if (music.status) {
		utils.replaceMessage(sendedMessage, dictionary, 'error_play_unplayable', {
			reason: music.reason
		});
		return;
	}
	if (music.liveBroadcastDetails && music.liveBroadcastDetails.isLiveNow) {
		utils.replaceMessage(sendedMessage, dictionary, 'error_play_live_not_supported');
		return;
	}
	if (!(music.formats && music.formats.length)) {
		utils.replaceMessage(sendedMessage, dictionary, 'error_play_no_stream');
		return;
	}
	if (!guild.me.voice.channelID) {
		const channel = await guild.channels.cache.get(member.voice.channelID);
		if (!channel.joinable) {
			utils.replaceMessage(sendedMessage, dictionary, 'error_play_cannot_join');
			return;
		}
		await utils.replaceMessage(sendedMessage, dictionary, 'play_joining');
		await channel.join();
	}
	if (!client.music)
		client.music = {};
	if (!client.music[guild.id])
		client.music[guild.id] = {};
	if (!client.music[guild.id].playlist)
		client.music[guild.id].playlist = [];
	music.request = member.user;
	client.music[guild.id].playlist.push(music);
	let key;
	if (!client.music[guild.id].connection) {
		const connection = guild.me.voice.connection;
		connection.on('disconnect', () => delete client.music[guild.id]);
		client.music[guild.id].connection = connection;
		await start(client, guild.id);
		key = 'play_success';
	} else
		key = 'play_queue';
	const embed = utils.getEmbed(dictionary, key, {
		title: music.title,
		url: music.url,
		channel: music.ownerChannelName,
		channelUrl: music.ownerProfileUrl
	});
	embed.setThumbnail(music.thumbnail.thumbnails[0].url);
	utils.replaceEmbed(sendedMessage, dictionary, embed);
}

module.exports = {
	name: 'play',
	aliases: ['p'],
	description: 'Play music.',
	privateMessage: false,
	message: async (message, object) => {
		if (!object.args.length) {
			utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
				format: `${object.prefix}play <url>`
			});
			return;
		}
		play(message.member, message.client, message.channel, message.guild, object.dictionary, object.args[0]);
	},
	play
};