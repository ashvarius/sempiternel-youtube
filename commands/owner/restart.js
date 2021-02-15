const process = require('process');

module.exports = {
	name: 'restart',
	private: true,
	description: 'description_restart',
	command: async object => {
		process.nextTick(() => object.client.emit('exit', 1));
		return object.client.utils.getMessage(object.channel, 'reboot_success');
	},
	permission: object => {
		if (object.client.config.owners.includes(object.user.id))
			return true;
		return false;
	}
};