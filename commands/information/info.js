module.exports = {
	name: 'info',
	aliases: [],
	private: true,
	command: async command => {
		const embed = command.message.client.utils.createEmbed();
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'servers'), command.message.client.guilds.cache.size);
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'channels'), command.message.client.channels.cache.size);
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'users'), command.message.client.users.cache.size);
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'emojis'), command.message.client.emojis.cache.size);
		embed.addField(command.message.client.utils.getMessage(command.message.channel, 'invitation'), `[${command.message.client.utils.getMessage(command.message.channel, 'link')}](${await command.message.client.generateInvite({ permissions: command.message.client.config.permissions })})`);
		command.message.client.utils.sendEmbed(command.message.channel, embed);
	}
};