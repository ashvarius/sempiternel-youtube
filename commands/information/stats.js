const os = require('os');

module.exports = {
	name: 'stats',
	private: true,
	description: 'description_stats',
	command: async object => {
		const embed = object.client.utils.createEmbed();
		embed.addFields([
			{
				name: `🔌 ${object.client.utils.getMessage(object.channel, 'servers')}`,
				value: object.client.guilds.cache.size,
				inline: true,
			},
			{
				name: `🧑 ${object.client.utils.getMessage(object.channel, 'users')}`,
				value: object.client.users.cache.size,
				inline: true,
			},
			{
				name: `🎧 ${object.client.utils.getMessage(object.channel, 'voices')}`,
				value: object.client.voice.connections.size,
				inline: true,
			}
		]);
		if (object.channel.type != 'dm')
			embed.addFields([
				{
					name: `🏟 ${object.client.utils.getMessage(object.channel, 'shard')}`,
					value: object.guild.shard.id,
					inline: true
				},
				{
					name: `⏱ ${object.client.utils.getMessage(object.channel, 'ping')}`,
					value: object.guild.shard.ping,
					inline: true
				}
			]);
		embed.addFields({
			name: `🧮 ${object.client.utils.getMessage(object.channel, 'ram')}`,
			value: `${((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2)}G/${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}G`,
			inline: true
		});
		let totalSeconds = (object.client.uptime / 1000);
		const days = Math.floor(totalSeconds / 86400);
		totalSeconds %= 86400;
		const hours = Math.floor(totalSeconds / 3600);
		totalSeconds %= 3600;
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = Math.floor(totalSeconds % 60);
		embed.addFields({
			name: `⏳ ${object.client.utils.getMessage(object.channel, 'uptime')}`,
			value: `${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds`
		});
		return embed;
	}
};