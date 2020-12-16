module.exports = {
	name: 'stats',
	aliases: [],
	private: true,
	command: async command => {
		const embed = command.message.client.utils.createEmbed();
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'shard'), command.message.guild.shard.id + 1);
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'ping'), command.message.guild.shard.ping);
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'servers'), command.message.client.guilds.cache.size);
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'channels'), command.message.client.channels.cache.size);
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'users'), command.message.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0));
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'emojis'), command.message.client.emojis.cache.size);
		command.message.client.utils.sendEmbed(command.message.channel, embed);
	}
};