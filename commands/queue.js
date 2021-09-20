const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Show video queue.'),
	async execute(interaction) {
		if (!interaction.guild.music) return interaction.reply({ content: 'No video is playing.', ephemeral: true });
		const embed = new MessageEmbed();
		const current = interaction.guild.music.current;
		embed.addField('Now Playing', `[${current.title}](${current.url})`);
		if (interaction.guild.music.queue && interaction.guild.music.queue.length) {
			let index = 0;
			const items = interaction.guild.music.queue.map(item => `${++index} - [${item.title}](${item.url})`).join('\n');
			embed.setDescription(`Up Next:\n${items}`);
		}
		return interaction.reply({ embeds: [embed], ephemeral: true });
	},
};
