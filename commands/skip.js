const { SlashCommandBuilder } = require('@discordjs/builders');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip the current video.'),
	async execute(interaction) {
		if (!interaction.guild.queue) interaction.guild.queue = [];
		if (!interaction.guild.queue.length) return interaction.reply({ content: 'No video is playing.', ephemeral: true });
		interaction.guild.player.emit(AudioPlayerStatus.Idle);
		return interaction.reply('The video has been skipped.');
	},
};
