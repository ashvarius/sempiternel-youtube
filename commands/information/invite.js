module.exports = {
	name: 'invite',
	aliases: [],
	private: true,
	description: 'description_invite',
	command: async command => {
		command.message.client.utils.sendMessage(command.message.channel, 'invite_success', {
			link: await command.message.client.generateInvite({
				permissions: command.message.client.config.permissions
			})
		});
	}
};