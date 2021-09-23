const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Measure bot pings.'),
	async execute(interaction) {
		if (!interaction.inGuild()) return interaction.reply({ content: `Websocket heartbeat: ${interaction.client.ws.ping}ms.`, ephemeral: true });
		const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
		return interaction.editReply(`Websocket heartbeat: ${interaction.client.ws.ping}ms.\nRoundtrip latency: ${sent.createdTimestamp - interaction.createdTimestamp}ms`);
	},
};
