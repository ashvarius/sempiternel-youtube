const steps = Object.freeze({
	'title': 0,
	'image': 1,
	'footer': 2
});
const cache = [];

const update = async (client, item, content) => {
	if (content)
		if (item.step == steps.title)
			item.title = content;
		else if (item.step == steps.image) {
			try {
				new URL(content);
			} catch {
				return;
			}
			item.image = content;
		}
	const channel = client.channels.cache.get(item.channel);
	if (!channel)
		return;
	if (item.step == steps.footer) {
		cache.splice(cache.indexOf(item), 1);
		const embed = client.utils.createEmbed(item.content);
		if (item.title)
			embed.setTitle(item.title);
		if (item.image)
			embed.setImage(item.image);
		if (content)
			embed.setFooter(content);
		client.utils.sendEmbed(channel, embed);
	}
	item.step++;
	if (item.send) {
		const send = channel.messages.cache.get(item.send);
		if (send)
			send.delete();
	}
	let send;
	for (const step of Object.keys(steps))
		if (steps[step] == item.step) {
			send = await client.utils.sendMessage(channel, `message_${step}`);
			if (!send)
				return;
			send.react('❌');
			break;
		}
	if (!send)
		return;
	item.send = send.id;
	const emoji = Array.from((await send.awaitReactions((_reaction, user) => {
		if (user.id != item.user)
			return false;
		return true;
	}, { time: 60000, max: 1, dispose: true })).values())[0];
	if (!emoji)
		return;
	update(client, item);
};

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
		for (const item of cache)
			if (item.user == command.message.author.id)
				return;
		let content = '';
		for (const arg of command.args) {
			if (content.length)
				content += ' ';
			content += arg;
		}
		const item = {
			channel: command.message.channel.id,
			user: command.message.author.id,
			content,
			step: -1
		};
		cache.push(item);
		update(command.message.client, item);
	},
	message: message => {
		if (message.channel.type == 'dm' || message.author.bot)
			return;
		for (const item of cache)
			if (item.user == message.author.id && item.channel == message.channel.id) {
				update(message.client, item, message.content);
				return;
			}
	}
};