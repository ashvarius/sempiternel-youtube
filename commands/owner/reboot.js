module.exports = {
	name: 'restart',
	aliases: ['reboot', 'rb', 'reload', 'rl'],
	private: true,
	command: async command => {
		await command.message.client.utils.sendMessage(command.message.channel, 'reboot_success');
		command.message.client.emit('exit', 1);
	},
	permission: (message) => {
		if (message.client.config.owners.includes(message.author.id))
			return true;
		return false;
	}
};