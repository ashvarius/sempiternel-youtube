const { URL } = require('url');

module.exports = {
	name: 'invite',
	private: true,
	description: 'description_invite',
	command: async object => {
		const permissions = [];
		for (const category of Object.keys(object.client.commands))
			for (const instance of Object.values(object.client.commands[category]))
				if (!object.client.config.disable.includes(instance.name) && instance.permissions)
					for (const permission of instance.permissions)
						permissions.push(permission);
		permissions.push('ADMINISTRATOR');
		const url = new URL(await object.client.generateInvite({
			permissions
		}));
		url.searchParams.set('scope', 'applications.commands bot');
		return object.client.utils.getMessage(object.channel, 'invite_success', {
			link: url.toString()
		});
	}
};