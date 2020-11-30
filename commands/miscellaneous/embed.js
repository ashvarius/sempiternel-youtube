const { Intents } = require("discord.js");

const cache = [];

module.exports = {
	name: 'embed',
	aliases: [],
	private: true,
	command: async command => {
		if (!command.args.length) {
			const embed = command.message.client.utils.createEmbed();
			embed.addField(`${command.prefix}${command.command} <message>`, command.message.client.utils.getMessage(command.message.channel, 'message_help'));
			command.message.client.utils.sendEmbed(command.message.channel, embed);
			return;
		}
		let content = '';
		for (const arg of command.args) {
			if (content.length)
				content += ' ';
			content += arg;
		}
		const embed = command.message.client.utils.createEmbed(content);
		const send = await command.message.client.utils.sendMessage(command.message.channel, 'message_image');
		send.react('❌');
		const length = cache.push({
			embed,
			send: send,
			user: command.message.author.id,
			channel: command.message.channel.id
		});
		const emoji = Array.from((await send.awaitReactions((reaction, user) => {
			if (user.id != command.message.author)
				return false;
			return true;
		}, { time: 60000, max: 1, dispose: true })).values())[0];
		cache.splice(length - 1, 1);
		if (!emoji)
			return;
		command.message.client.utils.sendEmbed(command.message.channel, embed);
		send.delete();
	},
	message: message => {
		if (message.channel.type == 'dm' || message.author.bot)
			return;
		for (const item of cache)
			if (item.user == message.author.id && item.channel == message.channel.id) {
				try {
					new URL(message.content);
				} catch {
					return;
				}
				item.embed.setImage(message.content);
				message.client.utils.sendEmbed(message.channel, item.embed);
				item.send.delete();
				return;
			}
	}
};