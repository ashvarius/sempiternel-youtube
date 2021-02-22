const { Constants, Util } = require('discord.js');

module.exports = {
	name: 'bot',
	private: true,
	description: 'description_bot',
	options: client => {
		let options;
		if (client.main)
			options = [
				{
					type: 1,
					name: 'addtoken',
					description: 'bot_help_addtoken',
					options: [
						{
							type: 3,
							name: 'token',
							description: 'bot_help_addtoken',
							required: true
						}
					]
				},
				{
					type: 1,
					name: 'removetoken',
					description: 'bot_help_removetoken',
					options: [
						{
							type: 4,
							name: 'number',
							description: 'bot_help_removetoken',
							required: true
						}
					]
				},
				{
					type: 1,
					name: 'list',
					description: 'bot_help_list'
				}
			];
		else
			options = [];
		const commands = [];
		for (const category of Object.keys(client.commands))
			for (const instance of Object.values(client.commands[category]))
				if (instance.name != module.exports.name)
					commands.push({
						name: instance.name,
						value: instance.name
					});
		options = options.concat([
			{
				type: 1,
				name: 'setname',
				description: 'bot_help_setname',
				options: [
					{
						type: 3,
						name: 'name',
						description: 'bot_help_setname',
						required: true
					}
				]
			},
			{
				type: 1,
				name: 'setavatar',
				description: 'bot_help_setavatar',
				options: [
					{
						type: 3,
						name: 'image_url',
						description: 'bot_help_setavatar',
						required: true
					}
				]
			},
			{
				type: 1,
				name: 'setpresence',
				description: 'bot_help_setpresence',
				options: [
					{
						type: 3,
						name: 'type',
						description: 'bot_help_setpresence',
						required: true,
						choices: [
							{
								name: 'playing',
								value: 'PLAYING'
							},
							{
								name: 'streaming',
								value: 'STREAMING'
							},
							{
								name: 'listening',
								value: 'LISTENING'
							},
							{
								name: 'watching',
								value: 'WATCHING'
							},
							{
								name: 'competing',
								value: 'COMPETING'
							}
						]
					},
					{
						type: 3,
						name: 'message',
						description: 'bot_help_setpresence',
						required: true
					}
				]
			},
			{
				type: 1,
				name: 'setcolor',
				description: 'bot_help_setcolor',
				options: [
					{
						type: 3,
						name: 'color',
						description: 'bot_help_setcolor',
						required: true
					}
				]
			}
		]);
		if (!client.main)
			options = options.concat([
				{
					type: 1,
					name: 'enable',
					description: 'bot_help_command_enable',
					options: [
						{
							type: 3,
							name: 'command',
							description: 'bot_help_command_enable',
							required: true,
							choices: commands
						}
					]
				},
				{
					type: 1,
					name: 'disable',
					description: 'bot_help_command_disable',
					options: [
						{
							type: 3,
							name: 'command',
							description: 'bot_help_command_disable',
							required: true,
							choices: commands
						}
					]
				}
			]);
		return options;
	},
	command: async object => {
		if (object.client.main) {
			if (['addtoken', 'list', 'removetoken'].includes(object.options[0].name)) {
				const userData = await object.client.utils.readFile(object.client.utils.docRef.collection('user').doc(object.user.id));
				if (!userData.bot)
					userData.bot = 0;
				const botConfig = await object.client.utils.readFile(object.client.utils.docRef);
				if (!botConfig.bot)
					botConfig.bot = {};
				if (!botConfig.bot[object.user.id])
					botConfig.bot[object.user.id] = [];
				if (object.options[0].name == 'list') {
					if (!botConfig.bot[object.user.id].length)
						return object.client.utils.getMessage(object.channel, 'bot_list_empty');
					else {
						const embed = object.client.utils.createEmbed();
						for (const bot of object.client.bot)
							if (botConfig.bot[object.user.id].includes(bot.client.config.token))
								botConfig.bot[object.user.id].splice(botConfig.bot[object.user.id].indexOf(bot.client.config.token), 1, bot);
						let index = 0;
						for (const bot of botConfig.bot[object.user.id]) {
							let status = 'Offline :red_circle:';
							let name;
							if (typeof bot == 'object') {
								name = bot.client.user.tag;
								if (bot.client.ws.status == Constants.Status.READY)
									status = 'Online :green_circle:';
							} else
								name = bot;
							embed.addField(`${++index} - ${name}`, `Status: ${status}`);
						}
						return embed;
					}
				} else if (object.options[0].name == 'addtoken') {
					for (const tokens of Object.values(botConfig.bot))
						if (tokens.includes(object.options[0].options[0].value))
							return object.client.utils.getMessage(object.channel, 'error_token_already_registered');
					if (object.client.config.owners.includes(object.user.id)
						|| userData.bot <= botConfig.bot[object.user.id].length)
						return object.client.utils.getMessage(object.channel, 'error_max_bot');
					const bot = new object.client.BotClass(object.client.logger, object.client.firebase, {
						owners: [
							object.user.id
						],
						token: object.options[0].options[0].value
					});
					const token = await bot.login().catch(error => {
						object.client.utils.sendMessage(object.channel, 'error_api', { error });
					});
					if (!token)
						return;
					botConfig.bot[object.user.id].push(token);
					await object.client.utils.savFile(object.client.utils.docRef, botConfig);
					object.client.bot.push(bot);
					return object.client.utils.getMessage(object.channel, 'bot_addtoken', {
						tag: bot.client.user.tag
					});
				} else {
					const number = object.options[0].options[0].value;
					if (number <= 0 || number > botConfig.bot[object.user.id].length)
						return object.client.utils.getMessage(object.channel, 'error_index_not_found', {
							index: number
						});
					const token = botConfig.bot[object.user.id][number - 1];
					let bot = object.client.bot.find(bot => bot.client.config.token == token);
					if (bot) {
						object.client.bot.splice(object.client.bot.indexOf(bot), 1);
						bot.client.emit('exit');
						bot = bot.client.user.tag;
					} else
						bot = token;
					botConfig.bot[object.user.id].splice(number - 1, 1);
					await object.client.utils.savFile(object.client.utils.docRef, botConfig);
					return object.client.utils.getMessage(object.channel, 'bot_removetoken', {
						tag: bot
					});
				}
			}
		}
		if (!object.client.config.owners.includes(object.user.id))
			return object.client.utils.getMessage(object.channel, 'error_not_owner');
		if (object.options[0].name == 'setname') {
			const name = object.options[0].options[0].value;
			if (name.length > 32)
				return object.client.utils.getMessage(object.channel, 'error_too_large', {
					type: object.client.utils.getMessage(object.channel, 'name'),
					max: '32'
				});
			object.client.user.setUsername(name);
			return object.client.utils.getMessage(object.channel, 'bot_setname');
		} else if (object.options[0].name == 'setavatar') {
			const url = object.options[0].options[0].value;
			try {
				new URL(url);
				await object.client.user.setAvatar(url);
			} catch (error) {
				return object.client.utils.getMessage(object.channel, 'error_api', { error: error.message });
			}
			return object.client.utils.getMessage(object.channel, 'bot_setavatar');
		}
		const botConfig = await object.client.utils.readFile(object.client.utils.docRef);
		if (object.options[0].name == 'setpresence') {
			const type = object.options[0].options[0].value;
			const message = object.options[0].options[1].value;
			botConfig.presence = {
				activity: {
					name: message,
					type: type.toUpperCase()
				}
			};
			await object.client.utils.savFile(object.client.utils.docRef, botConfig);
			object.client.config.presence = botConfig.presence;
			object.client.options.presence = botConfig.presence;
			object.client.user.setPresence(botConfig.presence);
			return object.client.utils.getMessage(object.channel, 'bot_setpresence');
		} else if (object.options[0].name == 'setcolor') {
			const color = Util.resolveColor(object.options[0].options[0].value);
			if (isNaN(color))
				return object.client.utils.getMessage(object.channel, 'error_invalid_color');
			botConfig.color = color;
			await object.client.utils.savFile(object.client.utils.docRef, botConfig);
			object.client.config.color = botConfig.color;
			return object.client.utils.getMessage(object.channel, 'bot_setcolor');
		}
		const command = object.options[0].options[0].value;
		if (command == null || command == module.exports.name)
			return object.client.utils.getMessage(object.channel, 'error_no_command', { command });
		if (!botConfig.disable)
			botConfig.disable = [];
		if (object.options[0].name == 'enable'
			&& botConfig.disable.includes(command))
			botConfig.disable.splice(botConfig.disable.indexOf(command), 1);
		else if (object.options[0].name == 'disable')
			botConfig.disable.push(command);
		await object.client.utils.savFile(object.client.utils.docRef, botConfig);
		object.client.config.disable = botConfig.disable;
		if (object.options[0].name == 'enable')
			return object.client.utils.getMessage(object.channel, 'bot_enable', { command });
		return object.client.utils.getMessage(object.channel, 'bot_disable', { command });
	},
	permission: async object => {
		if (object.client.config.owners.includes(object.user.id))
			return true;
		if (object.client.main) {
			const userData = await object.client.utils.readFile(object.client.utils.docRef.collection('user').doc(object.user.id));
			if (userData.bot)
				return true;
		}
		return false;
	},
	ready: (client) => {
		if (!client.main)
			return;
		if (client.config.bot)
			for (const id of Object.keys(client.config.bot))
				for (const token of client.config.bot[id]) {
					const pending = new client.BotClass(client.logger, client.firebase, {
						owners: [
							id
						],
						token
					});
					client.bot.push(pending);
					pending.login();
				}
	}
};