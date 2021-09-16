module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
		client.logger.log('info', 'The bot is online!');
	},
};
