const { MessageAttachment } = require('discord.js');
const Canvas = require('canvas');
const custom = {
	'join': 'welcome',
	'leave': 'goodbye'
};
const size = {
	avatar: 64,
	width: 400,
	height: 100,
	line: 20
};

const setBackground = async (canvas, link) => {
	const context = canvas.getContext('2d');
	context.beginPath();
	if (link) {
		const image = await Canvas.loadImage(link);
		let width = size.width;
		let height = size.height;
		const ratio = width / height;
		const image_ratio = image.width / image.height;
		if (ratio != image_ratio)
			if (ratio > image_ratio)
				height *= ratio / image_ratio;
			else
				width *= ratio / image_ratio;
		context.drawImage(image, (size.width - width) / 2, (size.height - height) / 2, width, height);
	} else
		context.strokeRect(0, 0, size.width, size.height);
	context.closePath();
};

const addAvatar = async (canvas, user, radius, position = { x: 0, y: 0 }) => {
	const context = canvas.getContext('2d');
	context.beginPath();
	context.arc(position.x, position.y, size.avatar / 2, 0, Math.PI * 2);
	context.clip();
	const avatar_url = await Canvas.loadImage(user.displayAvatarURL({
		format: 'png',
		dynamic: false,
		size: size.avatar
	}));
	context.drawImage(avatar_url, position.x - radius, position.y - radius, radius * 2, radius * 2);
	context.closePath();
};

const addtext = (canvas, style, text, { x = 0, y = 0 }, max = { width: 0, height: 0 }) => {
	const context = canvas.getContext('2d');
	context.beginPath();
	let font_size = 0;
	let metrics;
	do {
		context.font = `${++font_size}px sans-serif`;
		metrics = context.measureText(text);
	} while (metrics.width < max.width && metrics.emHeightAscent < max.height)
	context.font = `${--font_size}px sans-serif`;
	metrics = context.measureText(text);
	context.shadowColor = '#000000';
	context.shadowBlur = 3;
	context.fillStyle = style;
	context.fillText(text, x + (max.width - metrics.width) / 2, y + metrics.emHeightAscent / 2);
	context.closePath();
};

const generateCanvas = async (text, user, background) => {
	const canvas = Canvas.createCanvas(size.width, size.height);
	await setBackground(canvas, background);
	addtext(canvas, '#ffffff', text, { x: 0, y: size.height / 2 }, { width: (size.width - size.avatar) / 2, height: size.line - 1 });
	addtext(canvas, '#ffffff', user.tag, { x: (size.width + size.avatar) / 2, y: size.height / 2 }, { width: (size.width - size.avatar) / 2, height: size.line - 1 });
	addtext(canvas, '#ffffff', user.tag, { x: (size.width + size.avatar) / 2, y: size.height / 2 }, { width: (size.width - size.avatar) / 2, height: size.line - 1 });
	await addAvatar(canvas, user, size.avatar / 2, { x: size.width / 2, y: size.height / 2 });
	return canvas;
};

module.exports = {
	name: 'event',
	aliases: [],
	command: async command => {
		if (!command.message.guild.me.hasPermission('ATTACH_FILES')) {
			command.message.client.utils.sendMessage(command.message.channel, 'error_bot_no_permission', {
				permission: 'ATTACH_FILES'
			});
			return;
		}
		if (!command.args.length || !['log', 'image'].concat(Object.keys(custom)).includes(command.args[0].toLowerCase())) {
			const embed = command.message.client.utils.createEmbed();
			embed.addField(`${command.prefix}${command.command} log <on/off>`, command.message.client.utils.getMessage(command.message.channel, 'event_help_log'));
			embed.addField(`${command.prefix}${command.command} image <link>`, command.message.client.utils.getMessage(command.message.channel, 'event_help_image'));
			embed.addField(`${command.prefix}${command.command} <event> <on/off>`, command.message.client.utils.getMessage(command.message.channel, 'event_help_event'));
			//embed.addField(`${command.prefix}${command.command} <event> message <message>`, command.message.client.utils.getMessage(command.message.channel, 'event_help_event_message'));
			embed.addField('\u200B', `${command.message.client.utils.getMessage(command.message.channel, 'events')}: ${Object.keys(custom).join(', ')}`);
			command.message.client.utils.sendEmbed(command.message.channel, embed);
			return;
		}
		const cmd = command.args[0].toLowerCase();
		const option = command.args[1] && command.args[1].toLowerCase();
		if (cmd == 'log') {
			if (!['on', 'off'].includes(option)) {
				const embed = command.message.client.utils.createEmbed();
				embed.addField(`${command.prefix}${command.command} ${command.args[0]} <yes/no>`, command.message.client.utils.getMessage(command.message.channel, 'event_help_log'));
				command.message.client.utils.sendEmbed(command.message.channel, embed);
				return;
			}
			const guildData = command.message.client.utils.readFile(`guilds/${command.message.guild.id}.json`);
			if (!guildData.event)
				guildData.event = {};
			guildData.event.log = option == 'on' && command.message.channel.id;
			command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
			command.message.client.utils.sendMessage(command.message.channel, 'event_log', { option });
		} else if (cmd == 'image') {
			try {
				new URL(command.args[1]);
				await Canvas.loadImage(command.args[1]);
			} catch (error) {
				command.message.client.utils.sendMessage(command.message.channel, 'error_api', { error: error.message });
				return;
			}
			const guildData = command.message.client.utils.readFile(`guilds/${command.message.guild.id}.json`);
			if (!guildData.event)
				guildData.event = {};
			guildData.event.background = command.args[1];
			command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
			command.message.client.utils.sendMessage(command.message.channel, `event_image`);
		//} else if (option == 'message') {
		} else {
			if (!['on', 'off'].includes(option)) {
				const embed = command.message.client.utils.createEmbed();
				embed.addField(`${command.prefix}${command.command} ${command.args[0]} <yes/no>`, command.message.client.utils.getMessage(command.message.channel, 'event_help_event'));
				command.message.client.utils.sendEmbed(command.message.channel, embed);
				return;
			}
			const guildData = command.message.client.utils.readFile(`guilds/${command.message.guild.id}.json`);
			if (!guildData.event)
				guildData.event = {};
			guildData.event[cmd] = option == 'on' && command.message.channel.id;
			command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
			command.message.client.utils.sendMessage(command.message.channel, `event_${cmd}`, { option });
		}
	},
	permission: message => {
		if (!message.member.hasPermission('ADMINISTRATOR'))
			return false;
		return true;
	},
	guildMemberAdd: async member => {
		if (!member.guild.me.hasPermission('ATTACH_FILES'))
			return;
		const event = 'join';
		const guildData = member.client.utils.readFile(`guilds/${member.guild.id}.json`);
		if (!guildData.event)
			guildData.event = {};
		if (!guildData.event[event])
			return;
		const channel = member.guild.channels.cache.get(guildData.event[event]);
		if (!channel)
			return;
		const embed = member.client.utils.createEmbed();
		embed.attachFiles(new MessageAttachment((await generateCanvas(member.client.utils.getMessage(channel, custom[event]), member.user, guildData.event.background || member.client.config.background)).toBuffer(), 'canvas.png'));
		embed.setImage('attachment://canvas.png');
		member.client.utils.sendEmbed(channel, embed);
	},
	guildMemberRemove: async member => {
		if (!member.guild.me.hasPermission('ATTACH_FILES'))
			return;
		const event = 'leave';
		const guildData = member.client.utils.readFile(`guilds/${member.guild.id}.json`);
		if (!guildData.event)
			guildData.event = {};
		if (!guildData.event[event])
			return;
		const channel = member.guild.channels.cache.get(guildData.event[event]);
		if (!channel)
			return;
		const embed = member.client.utils.createEmbed();
		embed.attachFiles(new MessageAttachment((await generateCanvas(member.client.utils.getMessage(channel, custom[event]), member.user, guildData.event.background || member.client.config.background)).toBuffer(), 'canvas.png'));
		embed.setImage('attachment://canvas.png');
		member.client.utils.sendEmbed(channel, embed);
	}
};