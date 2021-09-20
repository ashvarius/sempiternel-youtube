const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('loop')
		.setDescription('Toggle the current playlist loop.'),
	async execute(interaction) {
		if (!interaction.guild.music) return interaction.reply({ content: 'No video is playing.', ephemeral: true });
		interaction.guild.music.loop = !interaction.guild.music.loop;
		if (interaction.guild.music.loop) return interaction.reply('The playlist is now looping.');
		return interaction.reply('The playlist is no longer looping.');
	},
};
