const { URL } = require('url');

module.exports = {
	name: 'invite',
	private: true,
	description: 'description_invite',
	command: async object => {
		const url = new URL(await object.client.generateInvite({
			permissions: object.client.config.permissions
		}));
		url.searchParams.set('scope', 'applications.commands bot');
		return object.client.utils.getMessage(object.channel, 'invite_success', {
			link: url.toString()
		});
	}
};