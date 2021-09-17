const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Show video queue.'),
	async execute(interaction) {
		if (!interaction.guild.queue) interaction.guild.queue = [];
		if (!interaction.guild.queue.length) return interaction.reply({ content: 'No video is playing.', ephemeral: true });
		let count = 0;
		const content = interaction.guild.queue.map((item) => {
			const index = count ? count : 'current';
			count++;
			return `${index} - [${item.videoDetails.title}](${item.videoDetails.video_url})`;
		}).join('\n');
		return interaction.reply({ content, ephemeral: true });
	},
};
