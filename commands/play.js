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
const { MessageActionRow, MessageButton, MessageEmbed, Permissions } = require('discord.js');
const ytpl = require('ytpl');
const { FFmpeg, opus } = require('prism-media');

const play = async guild => {
	guild.music.current = guild.music.queue.shift();
	const info = await getInfo(guild.music.current.url);
	const format = chooseFormat(info.formats, { quality: 'highestaudio' });
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
		'-vn',
	];
	if (guild.music.filter) options = options.concat(['-af', guild.music.filter]);
	const transcoder = new FFmpeg({ args: options });
	const stream = transcoder.pipe(new opus.Encoder({ rate: 48000, channels: 2, frameSize: 48 * 20 }));
	const resource = createAudioResource(stream, { inputType: StreamType.Opus });
	guild.music.player.play(resource);
	let nick = guild.music.current.title;
	if (nick.length > 32) nick = nick.substring(0, 32);
	if (guild.me.permissions.has(Permissions.FLAGS.CHANGE_NICKNAME)) guild.me.setNickname(nick);
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play a video on YouTube.')
		.addStringOption(option => option.setName('input').setDescription('The video to search on Youtube.').setRequired(true)),
	async execute(interaction) {
		if (!interaction.inGuild()) return interaction.reply({ content: 'You must be on a server to run this command.', ephemeral: true });
		await interaction.deferReply();

		let value = interaction.options.getString('input', true);
		const videos = [];
		const row = new MessageActionRow();
		const embed = new MessageEmbed();

		if (ytpl.validateID(value)) {
			let playlist = await ytpl(value, { pages: 1 });
			row.addComponents(new MessageButton().setLabel('Playlist').setStyle('LINK').setURL(playlist.url));
			if (playlist.author) row.addComponents(new MessageButton().setLabel('Channel').setStyle('LINK').setURL(playlist.author.url));
			embed.setDescription(playlist.title)
				.setImage(playlist.thumbnails.reduce((a, b) => (a.width > b.width ? a : b)).url);
			for (const item of playlist.items) if (item.isPlayable) videos.push({ title: item.title, url: item.url, duration: item.durationSec });
			while (playlist.continuation) {
				playlist = await ytpl.continueReq(playlist.continuation);
				for (const item of playlist.items) if (item.isPlayable) videos.push({ title: item.title, url: item.url, duration: item.durationSec });
			}
			embed.addField('Videos', videos.length.toString());
		}

		if (videos.length == 0) {
			if (!validateURL(value)) {
				const filters = await ytsr.getFilters(value);
				const filter = filters.get('Type').get('Video');
				const searchResults = await ytsr(filter.url, { limit: 1 });
				if (searchResults.items.length == 0) return interaction.editReply({ content: 'Could not find the video.', ephemeral: true });
				value = searchResults.items[0].url;
			}
			const basicInfo = await getBasicInfo(value);
			const video = {
				video_url: basicInfo.videoDetails.video_url,
				channel_url: basicInfo.videoDetails.author.channel_url,
				title: basicInfo.videoDetails.title,
				thumbnail: basicInfo.videoDetails.thumbnails.reduce((a, b) => (a.width > b.width ? a : b)).url,
				duration: basicInfo.videoDetails.lengthSeconds,
			};
			videos.push({ title: video.title, url: video.video_url, duration: video.duration });
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

		if (!interaction.guild.music) interaction.guild.music = {};
		if (!interaction.guild.music.queue) interaction.guild.music.queue = [];
		embed.setTitle(`Add in ${interaction.guild.music.queue.length + 1} position.`);
		interaction.guild.music.queue = interaction.guild.music.queue.concat(videos);

		if (interaction.guild.music.current) return interaction.editReply({ embeds: [embed], components: [row] });

		const voiceChannel = interaction.member.voice.channel;
		if (!voiceChannel) return interaction.editReply({ content: 'You must be in a voice channel.', ephemeral: true });
		if (!voiceChannel.joinable) return interaction.editReply({ content: 'Unable to join this channel.', ephemeral: true });
		const botVoiceChannel = interaction.guild.me.voice.channel;
		if (botVoiceChannel && voiceChannel.id != botVoiceChannel.id) return interaction.editReply({ content: 'You must be in the same channel as the bot.', ephemeral: true });

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
