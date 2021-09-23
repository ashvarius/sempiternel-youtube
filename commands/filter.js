const { SlashCommandBuilder } = require('@discordjs/builders');

const filters = {
	bassboost: 'bass=g=20,dynaudnorm=f=200',
	'8D': 'apulsator=hz=0.08',
	vaporwave: 'aresample=48000,asetrate=48000*0.8',
	nightcore: 'aresample=48000,asetrate=48000*1.25',
	phaser: 'aphaser=in_gain=0.4',
	tremolo: 'tremolo',
	vibrato: 'vibrato=f=6.5',
	surrounding: 'surround',
	pulsator: 'apulsator=hz=1',
	chorus: 'chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3',
	karaoke: 'stereotools=mlev=0.015625',
	desilencer: 'silenceremove=window=0:detection=peak:stop_mode=all:start_mode=all:stop_periods=-1:stop_threshold=0',
	clear: 'clear',
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('filter')
		.setDescription('Add a filter to the video.')
		.addStringOption(option => option.setName('input').setDescription('The filter you want.').setRequired(true).addChoices(Object.keys(filters).map(name => [name, filters[name]]))),
	async execute(interaction) {
		if (!interaction.inGuild()) return interaction.reply({ content: 'You must be on a server to run this command.', ephemeral: true });
		if (!interaction.guild.music) return interaction.reply({ content: 'No video is playing.', ephemeral: true });
		const value = interaction.options.getString('input', true);
		if (value == filters.clear) delete interaction.guild.music.filter;
		else interaction.guild.music.filter = value;
		return interaction.reply('The filter has been applied.\nNote: The filter will only apply to the next video.');
	},
};
