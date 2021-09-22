const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Quickly view your bot\'s statistics.'),
	execute(interaction) {
		const promises = [
			interaction.client.shard.fetchClientValues('guilds.cache.size'),
			interaction.client.shard.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
		];
		return Promise.all(promises)
			.then(results => {
				const totalGuilds = results[0].reduce((acc, guildCount) => acc + guildCount, 0);
				const totalMembers = results[1].reduce((acc, memberCount) => acc + memberCount, 0);
				return interaction.reply({ content: `Server count: ${totalGuilds}\nMember count: ${totalMembers}`, ephemeral: true });
			})
			.catch(console.error);
	},
};
