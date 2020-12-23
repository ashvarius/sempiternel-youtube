const process = require('process');
const winston = require('winston');
const BotClass = require('./instance.js');

const logger = winston.createLogger({
	transports: [
		new winston.transports.Console({
			level: 'debug',
			format: winston.format.colorize({ all: true })
		}),
		new winston.transports.File({
			filename: 'latest.log',
			options: {
				flags: 'w'
			}
		})
	],
	format: winston.format.combine(
		winston.format.timestamp({
			format: 'YYYY-MM-DD HH:mm:ss'
		}),
		winston.format.errors({ stack: true }),
		winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.stack ? info.stack : info.message}`)
	)
});

const bot = new BotClass(logger, {}, require('./config.json').client);
bot.client.main = true;
bot.client.BotClass = BotClass;
bot.client.bots = [];

bot.exit = true;
bot.on('exit', async (code = 0) => {
	for (const instance of bot.client.bots)
		if (instance != bot)
			await instance.client.emit('exit');
	await bot.destroy();
	process.exit(code);
});

process.on('SIGINT', () => bot.emit('exit'));
process.on('uncaughtException', error => logger.log('error', error));
process.on('unhandledRejection', error => logger.log('error', error));

bot.login();