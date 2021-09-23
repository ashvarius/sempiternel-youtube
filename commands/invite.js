const { SlashCommandBuilder } = require('@discordjs/builders');
const { Permissions } = require('discord.js');

const permissions = [
	Permissions.FLAGS.ADMINISTRATOR,
	Permissions.FLAGS.VIEW_CHANNEL,
	Permissions.FLAGS.CONNECT,
	Permissions.FLAGS.SPEAK,
	Permissions.FLAGS.CHANGE_NICKNAME,
];

module.exports = {
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('Generate an invitation link.'),
	execute(interaction) {
		const invite = interaction.client.generateInvite({
			scopes: ['applications.commands', 'bot'],
			permissions,
		});
		return interaction.reply({ content: `[Click here](${invite}) to invite the bot. :D`, ephemeral: true });
	},
};
