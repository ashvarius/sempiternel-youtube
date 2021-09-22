module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		if (!interaction.isCommand()) return;
		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) return;

		try { await command.execute(interaction); }
		catch (error) {
			console.error(error);
			const options = { content: 'There was an error while executing this command!', ephemeral: true };
			if (interaction.deferred || interaction.replied) return interaction.editReply(options);
			return interaction.reply(options);
		}
	},
};
