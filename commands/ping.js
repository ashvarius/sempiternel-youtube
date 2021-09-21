const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Measure bot pings.'),
	async execute(interaction) {
		interaction.reply(`Websocket heartbeat: ${interaction.client.ws.ping}ms.`);
	},
};
