const { SlashCommandBuilder } = require('@discordjs/builders');
const { getBasicInfo, chooseFormat, validateURL, getInfo } = require('ytdl-core');
const {
	AudioPlayerStatus,
	StreamType,
	createAudioPlayer,
	createAudioResource,
	joinVoiceChannel,
	VoiceConnectionStatus,
} = require('@discordjs/voice');
const ytsr = require('ytsr');
const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const ytpl = require('ytpl');
const { FFmpeg, opus } = require('prism-media');

const play = async guild => {
	console.log('play :D');
	guild.music.current = guild.music.queue.shift();
	const info = await getInfo(guild.music.current.url);
	const format = chooseFormat(info.formats, {
		filter: 'audioonly',
		quality: 'highestaudio',
	});
	let options = [
		'-reconnect', '1',
		'-reconnect_streamed', '1',
		'-reconnect_delay_max', '5',
		'-ss', 0,
		'-i', format.url,
		'-analyzeduration', '0',
		'-loglevel', '0',
		'-f', 's16le',
		'-ar', '48000',
		'-ac', '2',
	];
	if (guild.music.filter) options = options.concat(['-af', guild.music.filter]);
	const transcoder = new FFmpeg({ args: options });
	const stream = transcoder.pipe(new opus.Encoder({ rate: 48000, channels: 2, frameSize: 48 * 20 }));
	const resource = createAudioResource(stream, { inputType: StreamType.Opus });
	guild.music.player.play(resource);
	let nick = guild.music.current.title;
	if (nick.length > 32) nick = nick.substring(0, 32);
	guild.me.setNickname(nick);
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play a video on YouTube.')
		.addStringOption(option => option.setName('input').setDescription('The video to search on Youtube.').setRequired(true)),
	async execute(interaction) {
		if (!interaction.guild.music) interaction.guild.music = {};
		const voiceChannel = interaction.member.voice.channel;
		if (!voiceChannel) return interaction.reply({ content: 'You must be in a voice channel.', ephemeral: true });
		const botVoiceChannel = interaction.guild.me.voice.channel;
		if (botVoiceChannel && voiceChannel.id != botVoiceChannel.id) return interaction.reply({ content: 'You must be in the same channel as the bot.', ephemeral: true });
		await interaction.deferReply();

		const value = interaction.options.getString('input');
		const videos = [];
		const row = new MessageActionRow();
		const embed = new MessageEmbed();

		if (ytpl.validateID(value)) {
			let playlist = await ytpl(value, { pages: 1 });
			row.addComponents(
				new MessageButton()
					.setLabel('Playlist')
					.setStyle('LINK')
					.setURL(playlist.url),
				new MessageButton()
					.setLabel('Channel')
					.setStyle('LINK')
					.setURL(playlist.author.url),
			);
			embed.setDescription(playlist.title)
				.setImage(playlist.thumbnails.reduce((a, b) => (a.width > b.width ? a : b)).url);
			for (const item of playlist.items) if (item.isPlayable) videos.push({ title: item.title, url: item.url });
			while (playlist.continuation) {
				playlist = await ytpl.continueReq(playlist.continuation);
				for (const item of playlist.items) if (item.isPlayable) videos.push({ title: item.title, url: item.url });
			}
			embed.addField('Videos', videos.length.toString());
		}

		if (videos.length == 0) {
			let video;
			if (validateURL(value)) {
				const basicInfo = await getBasicInfo(value);
				videos.push({ title: basicInfo.videoDetails.title, url: basicInfo.videoDetails.video_url });
				video = {
					video_url: basicInfo.videoDetails.video_url,
					channel_url: basicInfo.videoDetails.author.channel_url,
					title: basicInfo.videoDetails.title,
					thumbnail: basicInfo.videoDetails.thumbnails.reduce((a, b) => (a.width > b.width ? a : b)).url,
				};
			}
			else {
				const filters = await ytsr.getFilters(value);
				const filter = filters.get('Type').get('Video');
				const searchResults = await ytsr(filter.url, { limit: 1 });
				if (searchResults.items.length == 0) return interaction.editReply({ content: 'Could not find the video.', ephemeral: true });
				const item = searchResults.items[0];
				videos.push({ title: item.title, url: item.url });
				video = {
					video_url: item.url,
					channel_url: item.author.url,
					title: item.title,
					thumbnail: item.thumbnails.reduce((a, b) => (a.width > b.width ? a : b)).url,
				};
			}
			row.addComponents(
				new MessageButton()
					.setLabel('Video')
					.setStyle('LINK')
					.setURL(video.video_url),
				new MessageButton()
					.setLabel('Channel')
					.setStyle('LINK')
					.setURL(video.channel_url),
			);
			embed.setDescription(video.title)
				.setImage(video.thumbnail);
		}

		if (!interaction.guild.music.queue) interaction.guild.music.queue = [];
		embed.setTitle(`Add in ${interaction.guild.music.queue.length + 1} position.`);
		interaction.guild.music.queue = interaction.guild.music.queue.concat(videos);

		if (botVoiceChannel && interaction.guild.music.current) return interaction.editReply({ embeds: [embed], components: [row] });
		const connection = joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: interaction.guild.id,
			adapterCreator: interaction.guild.voiceAdapterCreator,
		});
		connection.on(VoiceConnectionStatus.Disconnected, () => {
			connection.destroy();
			delete interaction.guild.music;
		});

		interaction.guild.music.player = createAudioPlayer();
		connection.subscribe(interaction.guild.music.player);
		interaction.guild.music.player.on(AudioPlayerStatus.Idle, () => {
			if (interaction.guild.music.loop) interaction.guild.music.queue.push(interaction.guild.music.current);
			if (interaction.guild.music && interaction.guild.music.queue && interaction.guild.music.queue.length) return play(interaction.guild);
			connection.disconnect();
		});
		play(interaction.guild);

		return interaction.editReply({ embeds: [embed.setTitle('Music playing')], components: [row] });
	},
};
