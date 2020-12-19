module.exports = {
	name: 'stats',
	aliases: [],
	private: true,
	description: 'description_stats',
	command: async command => {
		const embed = command.message.client.utils.createEmbed();
		if (command.message.channel.type != 'dm') {
			embed.addField(command.message.client.utils.getMessage(command.message.channel, 'shard'), command.message.guild.shard.id + 1, true);
			embed.addField(command.message.client.utils.getMessage(command.message.channel, 'ping'), command.message.guild.shard.ping, true);
		}
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'servers'), command.message.client.guilds.cache.size, true);
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'channels'), command.message.client.channels.cache.size, true);
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'users'), command.message.client.users.cache.size, true);
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'emojis'), command.message.client.emojis.cache.size, true);
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'voices'), command.message.client.voice.connections.size, true);
		command.message.client.utils.sendEmbed(command.message.channel, embed);
	}
};