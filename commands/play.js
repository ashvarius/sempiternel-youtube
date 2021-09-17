const { SlashCommandBuilder } = require('@discordjs/builders');
const ytdl = require('ytdl-core');
const {
	AudioPlayerStatus,
	StreamType,
	createAudioPlayer,
	createAudioResource,
	joinVoiceChannel,
} = require('@discordjs/voice');
const ytsr = require('ytsr');
const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

const play = (guild) => {
	const info = guild.queue[0];
	const stream = ytdl.downloadFromInfo(info, {
		filter: 'audioonly',
		highWaterMark: 1 << 25,
	});
	const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
	guild.player.play(resource);
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play a video on YouTube.')
		.addStringOption(option => option.setName('input').setDescription('The video to search on Youtube.').setRequired(true)),
	async execute(interaction) {
		const voiceChannel = interaction.member.voice.channel;
		if (!voiceChannel) return interaction.reply({ content: 'You must be in a voice channel.', ephemeral: true });

		const value = interaction.options.getString('input');
		const filters = await ytsr.getFilters(value);
		const filter = filters.get('Type').get('Video');
		const searchResults = await ytsr(filter.url, {
			limit: 1,
			pages: 1,
		});
		const info = await ytdl.getInfo(searchResults.items[0].url);
		if (!interaction.guild.queue) interaction.guild.queue = [];
		interaction.guild.queue.push(info);

		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setLabel('Video')
					.setStyle('LINK')
					.setURL(info.videoDetails.video_url),
				new MessageButton()
					.setLabel('Channel')
					.setStyle('LINK')
					.setURL(info.videoDetails.author.channel_url),
			);
		const embed = new MessageEmbed()
			.setDescription(info.videoDetails.title)
			.setImage(info.videoDetails.thumbnails.reduce((a, b) => (a.width > b.width ? a : b)).url);

		const botVoiceChannel = interaction.guild.me.voice.channel;
		if (botVoiceChannel && interaction.guild.queue.length != 1) {
			if (voiceChannel.id != botVoiceChannel.id) return interaction.reply({ content: 'You must be in the same channel as the bot.', ephemeral: true });
			return interaction.reply({ embeds: [embed.setTitle(`Add in ${interaction.guild.queue.length - 1} position.`)], components: [row] });
		}

		const connection = joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: interaction.guild.id,
			adapterCreator: interaction.guild.voiceAdapterCreator,
		});

		interaction.guild.player = createAudioPlayer();
		connection.subscribe(interaction.guild.player);
		interaction.guild.player.on(AudioPlayerStatus.Idle, () => {
			interaction.guild.queue.shift();
			if (interaction.guild.queue.length) return play(interaction.guild);
			connection.destroy();
		});
		play(interaction.guild);

		return interaction.reply({ embeds: [embed.setTitle('Music playing')], components: [row] });
	},
};
