const { SlashCommandBuilder } = require('@discordjs/builders');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip the current video.'),
	async execute(interaction) {
		if (!interaction.guild.music) return interaction.reply({ content: 'No video is playing.', ephemeral: true });
		interaction.guild.music.player.emit(AudioPlayerStatus.Idle);
		return interaction.reply('The video has been skipped.');
	},
};
