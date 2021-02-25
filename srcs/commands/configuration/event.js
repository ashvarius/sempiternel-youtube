const { MessageAttachment } = require('discord.js');
const Canvas = require('canvas');
const size = {
	avatar: 64,
	width: 400,
	height: 100,
	line: 20
};
const colors = {
	message: 'AQUA',
	vocal: 'PURPLE',
	management: 'YELLOW',
	sanction: 'RED'
};
const invites = {};

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
	if (background)
		await setBackground(canvas, background);
	addtext(canvas, '#ffffff', text, { x: 0, y: size.height / 2 }, { width: (size.width - size.avatar) / 2, height: size.line - 1 });
	addtext(canvas, '#ffffff', user.tag, { x: (size.width + size.avatar) / 2, y: size.height / 2 }, { width: (size.width - size.avatar) / 2, height: size.line - 1 });
	addtext(canvas, '#ffffff', user.tag, { x: (size.width + size.avatar) / 2, y: size.height / 2 }, { width: (size.width - size.avatar) / 2, height: size.line - 1 });
	await addAvatar(canvas, user, size.avatar / 2, { x: size.width / 2, y: size.height / 2 });
	return canvas;
};

const attachCanvas = (embed, canvas) => {
	embed.attachFiles(new MessageAttachment(canvas.toBuffer(), 'canvas.png'));
	embed.setImage('attachment://canvas.png');
};

const getLog = async (guild, user, type) => {
	if (!guild.me.hasPermission('VIEW_AUDIT_LOG'))
		return;
	const fetchedLogs = await guild.fetchAuditLogs({
		limit: 1,
		type,
	});
	const log = fetchedLogs.entries.first();
	if (log && log.target && log.target.id == user.id)
		return log;
	return null;
};

module.exports = {
	name: 'event',
	aliases: [],
	description: 'description_event',
	permissions: ['BAN_MEMBERS', 'MANAGE_GUILD', 'VIEW_AUDIT_LOG', 'ATTACH_FILES'],
	options: [
		{
			type: 2,
			name: 'image',
			description: 'event_help_image',
			options: [
				{
					type: 1,
					name: 'toggle',
					description: 'event_help_image_toggle',
					options: [
						{
							type: 7,
							name: 'channel',
							description: 'event_help_image_toggle',
						}
					]
				},
				{
					type: 1,
					name: 'url',
					description: 'event_help_image_url',
					options: [
						{
							type: 3,
							name: 'image_url',
							description: 'event_help_image_url',
							required: true
						}
					]
				}
			]
		},
		{
			type: 1,
			name: 'toggle',
			description: 'event_help_toggle',
			options: [
				{
					type: 3,
					name: 'category',
					description: 'event_help_toggle',
					required: true,
					choices: [
						{
							name: 'message',
							value: 'message'
						},
						{
							name: 'vocal',
							value: 'vocal'
						},
						{
							name: 'management',
							value: 'management'
						},
						{
							name: 'sanction',
							value: 'sanction'
						}
					]
				},
				{
					type: 7,
					name: 'channel',
					description: 'event_help_toggle',
				}
			]
		}
	],
	command: async object => {
		const guildData = await object.client.utils.readFile(object.client.utils.docRef.collection('guild').doc(object.guild.id));
		if (!guildData.event)
			guildData.event = {};
		if (object.options[0].name == 'image') {
			if (!guildData.event.image)
				guildData.event.image = {};
			if (object.options[0].options[0].name == 'toggle') {
				let channel;
				if (object.options[0].options[0].options)
					channel = await object.client.channels.fetch(object.options[0].options[0].options[0].value).catch(() => { });
				else
					channel = object.channel;
				if (channel == null
					|| (channel.type != 'text' && channel.type != 'news')
					|| !channel.viewable
					|| channel.guild.id != object.guild.id)
					return object.client.utils.getMessage(object.channel, 'error_not_found', {
						type: object.client.utils.getMessage(object.channel, 'channel'),
						item: object.options[0].options[0].options[0] && object.options[0].options[0].options[0].value
					});
				if (guildData.event.image.channel == channel.id)
					delete guildData.event.image.channel;
				else
					guildData.event.image.channel = channel.id;
				await object.client.utils.savFile(object.client.utils.docRef.collection('guild').doc(object.guild.id), guildData);
				if (guildData.event.image.channel == channel)
					return object.client.utils.getMessage(object.channel, 'event_image_toggle_true', { channel });
				return object.client.utils.getMessage(object.channel, 'event_image_toggle_false');
			} else if (object.options[0].options[0].name == 'url') {
				const url = object.options[0].options[0].options[0].value;
				try {
					new URL(url);
					await Canvas.loadImage(url);
				} catch (error) {
					return object.client.utils.getMessage(object.channel, 'error_api', { error: error.message });
				}
				guildData.event.image.url = url;
				await object.client.utils.savFile(object.client.utils.docRef.collection('guild').doc(object.guild.id), guildData);
				return object.client.utils.getMessage(object.channel, 'event_image_url');
			}
		} else if (object.options[0].name == 'toggle') {
			let channel;
			if (object.options[0].options.length > 1)
				channel = await object.client.channels.fetch(object.options[0].options[1].value).catch(() => { });
			else
				channel = object.channel;
			if (channel == null
				|| (channel.type != 'text' && channel.type != 'news')
				|| !channel.viewable
				|| channel.guild.id != object.guild.id)
				return object.client.utils.getMessage(object.channel, 'error_not_found', {
					type: object.client.utils.getMessage(object.channel, 'channel'),
					item: object.options[0].options[1] && object.options[0].options[1].value
				});
			const category = object.options[0].options[0].value;
			if (guildData.event[category] == channel.id)
				delete guildData.event[category];
			else
				guildData.event[category] = channel.id;
			await object.client.utils.savFile(object.client.utils.docRef.collection('guild').doc(object.guild.id), guildData);
			if (guildData.event[category])
				return object.client.utils.getMessage(object.channel, 'event_toggle_true', { category, channel });
			return object.client.utils.getMessage(object.channel, 'event_toggle_false', { category, channel });
		}
	},
	checkPermission: object => {
		if (!object.member.hasPermission('ADMINISTRATOR'))
			return false;
		return true;
	},
	ready: async client => {
		for (const guild of client.guilds.cache.values()) {
			if (!guild.me.hasPermission('MANAGE_GUILD'))
				continue;
			invites[guild.id] = await guild.fetchInvites();
		}
	},
	guildCreate: async guild => {
		if (!guild.me.hasPermission('MANAGE_GUILD'))
			return;
		invites[guild.id] = await guild.fetchInvites();
	},
	guildDelete: guild => {
		delete invites[guild.id];
	},
	guildMemberAdd: async member => {
		const guildData = await member.client.utils.readFile(member.client.utils.docRef.collection('guild').doc(member.guild.id));
		if (!guildData.event)
			guildData.event = {};
		if (!guildData.event.image)
			guildData.event.image = {};
		if (!guildData.event.image.channel)
			return;
		let channel = await member.client.channels.fetch(guildData.event.image.channel);
		if (channel && channel.permissionsFor(member.guild.me).has(['EMBED_LINKS', 'ATTACH_FILES'])) {
			const embed = member.client.utils.createEmbed();
			attachCanvas(embed, await generateCanvas(member.client.utils.getMessage(channel, 'welcome'), member.user, guildData.event.image.url));
			member.client.utils.sendEmbed(channel, embed);
		}
		const event = 'management';
		if (!guildData.event[event])
			return;
		channel = await member.client.channels.fetch(guildData.event[event]);
		if (!(member.guild.me.hasPermission('MANAGE_GUILD') && channel
			&& channel.permissionsFor(member.guild.me).has(['EMBED_LINKS', 'ATTACH_FILES'])))
			return;
		const lastInvites = invites[member.guild.id];
		invites[member.guild.id] = await member.guild.fetchInvites();
		if (!lastInvites)
			return;
		const invite = invites[member.guild.id].find(item => lastInvites.get(item.code).uses < item.uses);
		if (!invite)
			return;
		const embed = member.client.utils.createEmbed();
		embed.setColor(colors[event]);
		embed.setTitle(member.client.utils.getMessage(channel, 'event_join', { user: member.displayName }));
		embed.addField(`🏷️ ${member.client.utils.getMessage(channel, 'user')}`, member.user, true);
		embed.addField(`🌐 ${member.client.utils.getMessage(channel, 'tag')}`, member.user.tag, true);
		embed.addField(`🤖 ${member.client.utils.getMessage(channel, 'id')}`, member.user.id, true);
		embed.addField(`🎀 ${member.client.utils.getMessage(channel, 'inviter')}`, invite.inviter.tag, true);
		embed.addField(`🔗 ${member.client.utils.getMessage(channel, 'code')}`, invite.code, true);
		embed.addField(`🐾 ${member.client.utils.getMessage(channel, 'uses')}`, invite.uses, true);
		member.client.utils.sendEmbed(channel, embed);
	},
	guildMemberRemove: async member => {
		const guildData = await member.client.utils.readFile(member.client.utils.docRef.collection('guild').doc(member.guild.id));
		if (!guildData.event)
			guildData.event = {};
		if (!guildData.event.image)
			guildData.event.image = {};
		const channel = await member.client.channels.fetch(guildData.event.image.channel);
		if (!channel || !channel.permissionsFor(member.guild.me).has(['EMBED_LINKS', 'ATTACH_FILES']))
			return;
		const embed = member.client.utils.createEmbed();
		attachCanvas(embed, await generateCanvas(member.client.utils.getMessage(channel, 'goodbye'), member.user, guildData.event.image.url));
		member.client.utils.sendEmbed(channel, embed);
	},
	messageDelete: async message => {
		if (message.channel.type == 'dm')
			return;
		const guildData = await message.client.utils.readFile(message.client.utils.docRef.collection('guild').doc(message.guild.id));
		if (!guildData.event)
			guildData.event = {};
		const event = 'message';
		if (!guildData.event[event])
			return;
		const channel = await message.client.channels.fetch(guildData.event[event]);
		if (!(channel && channel.permissionsFor(message.guild.me).has(['EMBED_LINKS', 'ATTACH_FILES'])))
			return;
		const log = await getLog(message.guild, message.author, 'MESSAGE_DELETE');
		const embed = message.client.utils.createEmbed(message.content);
		embed.setColor(colors[event]);
		embed.setTitle(message.client.utils.getMessage(channel, 'event_message_delete', { user: message.member.displayName }));
		embed.addField(`🏷️ ${message.client.utils.getMessage(channel, 'user')}`, message.author, true);
		if (log)
			embed.addField(`👮 ${message.client.utils.getMessage(channel, 'executor')}`, log.executor, true);
		message.client.utils.sendEmbed(channel, embed);
	},
	messageUpdate: async (oldMessage, newMessage) => {
		if (newMessage.channel.type == 'dm' || newMessage.author.bot)
			return;
		const guildData = await newMessage.client.utils.readFile(newMessage.client.utils.docRef.collection('guild').doc(newMessage.guild.id));
		if (!guildData.event)
			guildData.event = {};
		const event = 'message';
		if (!guildData.event[event])
			return;
		const channel = await newMessage.client.channels.fetch(guildData.event[event]);
		if (!(channel && channel.permissionsFor(newMessage.guild.me).has(['EMBED_LINKS', 'ATTACH_FILES'])))
			return;
		const embed = newMessage.client.utils.createEmbed(oldMessage.content);
		embed.setFooter(newMessage.content);
		embed.setColor(colors[event]);
		embed.setTitle(newMessage.client.utils.getMessage(channel, 'event_message_update', { user: newMessage.member.displayName }));
		embed.addField(`🏷️ ${newMessage.client.utils.getMessage(channel, 'user')}`, newMessage.author, true);
		newMessage.client.utils.sendEmbed(channel, embed);
	},
	voiceStateUpdate: async (oldState, newState) => {
		if (oldState.channelID == newState.channelID)
			return;
		const guildData = await newState.guild.client.utils.readFile(newState.guild.client.utils.docRef.collection('guild').doc(newState.guild.id));
		if (!guildData.event)
			guildData.event = {};
		const event = 'vocal';
		if (!guildData.event[event])
			return;
		const channel = await newState.guild.client.channels.fetch(guildData.event[event]);
		if (!(channel && channel.permissionsFor(newState.guild.me).has(['EMBED_LINKS', 'ATTACH_FILES'])))
			return;
		const embed = newState.guild.client.utils.createEmbed();
		embed.setColor(colors[event]);
		embed.addField(`🏷️ ${newState.guild.client.utils.getMessage(channel, 'user')}`, newState.member.user, true);
		if (oldState.channelID)
			embed.addField(`🕳️ ${newState.guild.client.utils.getMessage(channel, 'old')}`, oldState.channel, true);
		if (newState.channelID)
			embed.addField(`🔮 ${newState.guild.client.utils.getMessage(channel, 'new')}`, newState.channel, true);
		if (!oldState.channelID)
			embed.setTitle(newState.guild.client.utils.getMessage(channel, 'event_voice_join', { user: newState.member.displayName }));
		else if (!newState.channelID) {
			embed.setTitle(newState.guild.client.utils.getMessage(channel, 'event_voice_leave', { user: newState.member.displayName }));
			const log = await getLog(newState.guild, newState.member.user, 'MEMBER_DISCONNECT');
			if (log)
				embed.addField(`👮 ${newState.guild.client.utils.getMessage(channel, 'executor')}`, log.executor, true);
		} else {
			embed.setTitle(newState.guild.client.utils.getMessage(channel, 'event_voice_update', { user: newState.member.displayName }));
			const log = await getLog(newState.guild, newState.member.user, 'MEMBER_MOVE');
			if (log)
				embed.addField(`👮 ${newState.guild.client.utils.getMessage(channel, 'executor')}`, log.executor, true);
		}
		newState.guild.client.utils.sendEmbed(channel, embed);
	}
};