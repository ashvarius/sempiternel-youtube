const BotClass = require('./instance.js');
const { exit } = require('process');

const bot = new BotClass();
bot.client.main = true;
bot.client.BotClass = BotClass;
bot.client.bots = [];

bot.exit = true;
bot.on('exit', async (code = 0) => {
	for (const instance of bot.client.bots)
		if (instance != bot)
			await instance.client.emit('exit');
	await bot.destroy();
	exit(code);
});

process.on('SIGINT', () => {
	bot.emit('exit');
});

process.on('uncaughtException', error => {
	console.error(error);
	bot.emit('exit', 1);
});

bot.login().then(() => {
	const botsData = bot.client.utils.readFile('../bots.json');
	for (const id of Object.keys(botsData))
		for (const token of botsData[id]) {
			const pending = new BotClass({
				owners: [
					id
				],
				token
			});
			pending.login().then(() => bot.client.bots.push(pending)).catch(() => { });
		}
});