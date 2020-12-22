const os = require('os');

module.exports = {
	name: 'stats',
	aliases: [],
	private: true,
	description: 'description_stats',
	command: async command => {
		const embed = command.message.client.utils.createEmbed();
		embed.addFields([
			{
				name: `🔌 ${command.message.client.utils.getMessage(command.message.channel, 'servers')}`,
				value: command.message.client.guilds.cache.size,
				inline: true,
			},
			{
				name: `🧑 ${command.message.client.utils.getMessage(command.message.channel, 'users')}`,
				value: command.message.client.users.cache.size,
				inline: true,
			},
			{
				name: `🎧 ${command.message.client.utils.getMessage(command.message.channel, 'voices')}`,
				value: command.message.client.voice.connections.size,
				inline: true,
			}
		]);
		if (command.message.channel.type != 'dm')
			embed.addFields([
				{
					name: `🏟 ${command.message.client.utils.getMessage(command.message.channel, 'shard')}`,
					value: command.message.guild.shard.id,
					inline: true
				},
				{
					name: `⏱ ${command.message.client.utils.getMessage(command.message.channel, 'ping')}`,
					value: command.message.guild.shard.ping,
					inline: true
				}
			]);
		embed.addFields({
			name: `🧮 ${command.message.client.utils.getMessage(command.message.channel, 'ram')}`,
			value: `${((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2)}G/${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}G`,
			inline: true
		});
		let totalSeconds = (command.message.client.uptime / 1000);
		const days = Math.floor(totalSeconds / 86400);
		totalSeconds %= 86400;
		const hours = Math.floor(totalSeconds / 3600);
		totalSeconds %= 3600;
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = Math.floor(totalSeconds % 60);
		embed.addFields({
			name: `⏳ ${command.message.client.utils.getMessage(command.message.channel, 'uptime')}`,
			value: `${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds`
		});
		command.message.client.utils.sendEmbed(command.message.channel, embed);
	}
};