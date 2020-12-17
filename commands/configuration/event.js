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
	} while (metrics.width < max.width && metrics.emHeightAscent < max.height);
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

const keyOf = (guild, user) => {
	return {
		server: guild.name,
		user: user,
		tag: user.tag,
		id: user.id
	};
};

const sendImage = async (guild, user, event) => {
	const guildData = guild.client.utils.readFile(`guilds/${guild.id}.json`);
	if (!(guildData.event && guildData.event[event] && guildData.event[event].channel))
		return;
	const channel = guild.channels.cache.get(guildData.event[event].channel);
	if (!(channel && channel.permissionsFor(guild.me).has(['EMBED_LINKS', 'ATTACH_FILES'])))
		return;
	let canvas;
	try {
		canvas = await generateCanvas(guild.client.utils.getMessage(channel, custom[event]), user, guildData.event.background || guild.client.config.background);
	} catch {
		if (!guildData.event.background)
			return;
		try {
			canvas = await generateCanvas(guild.client.utils.getMessage(channel, custom[event]), user, guild.client.config.background);
			delete guildData.event.background;
			guild.client.utils.savFile(`guilds/${guild.id}.json`, guildData);
		} catch {
			return;
		}
	}
	const object = keyOf(guild, user);
	let message;
	if (guildData.event[event].message) {
		message = guildData.event[event].message;
		for (const key of Object.keys(object))
			message = `${message}`.replace(new RegExp(`<${key}>`, 'g'), object[key]);
		if (message.length > 2048)
			return (guild.client.utils.getMessage(channel, 'error_too_large_message'));
	} else
		message = guild.client.utils.getMessage(channel, `event_message_${event}`, object);
	const embed = guild.client.utils.createEmbed(message);
	embed.attachFiles(new MessageAttachment(canvas.toBuffer(), 'canvas.png'));
	embed.setImage('attachment://canvas.png');
	guild.client.utils.sendEmbed(channel, embed);
};

const log = async (guild, user, type) => {
	if (!guild.me.hasPermission('VIEW_AUDIT_LOG'))
		return;
	const guildData = guild.client.utils.readFile(`guilds/${guild.id}.json`);
	if (!(guildData.event && guildData.event.log))
		return;
	const channel = guild.channels.cache.get(guildData.event.log);
	if (!channel)
		return;
	const fetchedLogs = await guild.fetchAuditLogs({
		limit: 1,
		type,
	});
	const log = fetchedLogs.entries.first();
	let who;
	if (log) {
		const { executor, target } = log;
		if (target.id === user.id)
			who = executor;
	}
	const embed = guild.client.utils.createEmbed();
	embed.setTitle(type);
	console.log(who);
	embed.addField(guild.client.utils.getMessage(channel, 'who'), who ? who.tag : guild.client.utils.getMessage(channel, 'unknown'), true);
	embed.addField(guild.client.utils.getMessage(channel, 'victim'), user.tag, true);
	guild.client.utils.sendEmbed(channel, embed);
};

module.exports = {
	name: 'event',
	aliases: [],
	command: async command => {
		for (const permission of ['BAN_MEMBERS', 'VIEW_AUDIT_LOG', 'ATTACH_FILES'])
			if (!command.message.guild.me.hasPermission(permission)) {
				command.message.client.utils.sendMessage(command.message.channel, 'error_bot_no_permission', {
					permission
				});
				return;
			}
		if (!command.args.length || !['log', 'image'].concat(Object.keys(custom)).includes(command.args[0].toLowerCase())) {
			const embed = command.message.client.utils.createEmbed();
			embed.addField(`${command.prefix}${command.command} log <on/off>`, command.message.client.utils.getMessage(command.message.channel, 'event_help_log'));
			embed.addField(`${command.prefix}${command.command} image <link>`, command.message.client.utils.getMessage(command.message.channel, 'event_help_image'));
			embed.addField(`${command.prefix}${command.command} <event> <on/off>`, command.message.client.utils.getMessage(command.message.channel, 'event_help_event'));
			embed.addField(`${command.prefix}${command.command} <event> message <message>`, command.message.client.utils.getMessage(command.message.channel, 'event_help_event_message'));
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
			command.message.client.utils.sendMessage(command.message.channel, 'event_image');
		} else if (option == 'message') {
			if (command.args.length == 2) {
				const embed = command.message.client.utils.createEmbed();
				embed.addField(`${command.prefix}${command.command} ${command.args[0]} ${command.args[1]} <message>`, command.message.client.utils.getMessage(command.message.channel, 'event_help_event_message'));
				embed.addField('\u200B', `${command.message.client.utils.getMessage(command.message.channel, 'variables')}: ${Object.keys(keyOf(command.message.guild, command.message.author)).map(item => `<${item}>`).join(', ')}`);
				command.message.client.utils.sendEmbed(command.message.channel, embed);
				return;
			}
			const message = command.args.slice(2).join(' ');
			const guildData = command.message.client.utils.readFile(`guilds/${command.message.guild.id}.json`);
			if (!guildData.event)
				guildData.event = {};
			if (typeof guildData.event[cmd] != 'object')
				guildData.event[cmd] = {};
			guildData.event[cmd].message = message;
			command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
			command.message.client.utils.sendMessage(command.message.channel, `event_${cmd}_message`, { message });
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
			if (typeof guildData.event[cmd] != 'object')
				guildData.event[cmd] = {};
			guildData.event[cmd].channel = option == 'on' && command.message.channel.id;
			command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
			command.message.client.utils.sendMessage(command.message.channel, `event_${cmd}_activation`, { option });
		}
	},
	permission: message => {
		if (!message.member.hasPermission('ADMINISTRATOR'))
			return false;
		return true;
	},
	guildMemberAdd: async member => {
		await sendImage(member.guild, member.user, 'join');
	},
	guildMemberRemove: async member => {
		await sendImage(member.guild, member.user, 'leave');
		if (!member.guild.me.hasPermission('BAN_MEMBERS') || !(await member.guild.fetchBan(member.user)))
			await log(member.guild, member.user, 'MEMBER_KICK');
	},
	messageDelete: async message => {
		if (message.channel.type != 'dm')
			await log(message.guild, message.author, 'MESSAGE_DELETE');
	},
	guildBanAdd: async (guild, user) => {
		await log(guild, user, 'MEMBER_BAN_ADD');
	}
};