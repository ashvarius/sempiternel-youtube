const { Constants, Util } = require('discord.js');

module.exports = {
	name: 'bot',
	aliases: ['token'],
	private: true,
	command: async command => {
		const embed = command.message.client.utils.createEmbed();
		if (command.message.client.main) {
			if (command.message.client.config.owners.includes(command.message.author.id))
				embed.addField(`${command.prefix}${command.command} <add/remove> <userId>`, command.message.client.utils.getMessage(command.message.channel, 'bot_help_owner'));
			const userData = command.message.client.utils.readFile(`users/${command.message.author.id}.json`);
			if (!userData.bot)
				userData.bot = 0;
			if (userData.bot) {
				if (embed.fields.length)
					embed.addField('\u200B', '\u200B');
				embed.addField(`${command.prefix}${command.command} addtoken <token>`, command.message.client.utils.getMessage(command.message.channel, 'bot_help_addtoken'));
				embed.addField(`${command.prefix}${command.command} list`, command.message.client.utils.getMessage(command.message.channel, 'bot_help_list'));
				embed.addField(`${command.prefix}${command.command} removetoken <number>`, command.message.client.utils.getMessage(command.message.channel, 'bot_help_removetoken'));
			}
		}
		if (command.message.client.config.owners.includes(command.message.author.id)) {
			if (embed.fields.length)
				embed.addField('\u200B', '\u200B');
			embed.addField(`${command.prefix}${command.command} setpresence <type> <message>`, command.message.client.utils.getMessage(command.message.channel, 'bot_help_setpresence'));
			embed.addField(`${command.prefix}${command.command} setcolor <hex>`, command.message.client.utils.getMessage(command.message.channel, 'bot_help_setcolor'));
			embed.addField(`${command.prefix}${command.command} <enable/disable> <command>`, command.message.client.utils.getMessage(command.message.channel, 'bot_help_command'));
		}
		if (!embed.fields.length) {
			command.message.client.utils.sendMessage(command.message.channel, 'error_no_access');
			return;
		}
		if (!command.args.length) {
			command.message.client.utils.sendEmbed(command.message.channel, embed);
			return;
		}
		const cmd = command.args[0].toLowerCase();
		if (command.message.client.main) {
			if (['add', 'remove'].includes(cmd)
				&& command.message.client.config.owners.includes(command.message.author.id)) {
				if (command.args.length == 1) {
					const embed = command.message.client.utils.createEmbed();
					if (cmd == 'add')
						embed.addField(`${command.prefix}${command.command} add <userId>`, `${command.message.client.utils.getMessage(command.message.channel, 'bot_help_owner_add')}\n${command.message.client.utils.getMessage(command.message.channel, 'help_id')}`);
					else
						embed.addField(`${command.prefix}${command.command} remove <userId>`, `${command.message.client.utils.getMessage(command.message.channel, 'bot_help_owner_remove')}\n${command.message.client.utils.getMessage(command.message.channel, 'help_id')}`);
					command.message.client.utils.sendEmbed(command.message.channel, embed);
					return;
				}
				const user = await command.message.client.users.fetch(command.args[1], false).catch(error => {
					command.message.client.utils.sendMessage(command.message.channel, 'error_api', { error });
					return;
				});
				if (!user)
					return;
				const userData = command.message.client.utils.readFile(`users/${user.id}.json`);
				if (!userData.bot)
					userData.bot = 0;
				if (cmd == 'add')
					userData.bot++;
				else if (userData.bot > 0)
					userData.bot--;
				command.message.client.utils.savFile(`users/${user.id}.json`, userData);
				command.message.client.utils.sendMessage(command.message.channel, 'bot_add', {
					user: user.username,
					count: userData.bot
				});
				return;
			}
			if (['addtoken', 'list', 'removetoken'].includes(cmd)) {
				const userData = command.message.client.utils.readFile(`users/${command.message.author.id}.json`);
				if (!userData.bot)
					userData.bot = 0;
				if (userData.bot) {
					const botsData = command.message.client.utils.readFile('../bots.json');
					if (!botsData[command.message.author.id])
						botsData[command.message.author.id] = [];
					if (cmd == 'list') {
						if (!botsData[command.message.author.id].length) {
							command.message.client.utils.sendMessage(command.message.channel, 'bot_list_empty');
						} else {
							const embed = command.message.client.utils.createEmbed();
							for (const bot of command.message.client.bots)
								if (botsData[command.message.author.id].includes(bot.client.config.token))
									botsData[command.message.author.id].splice(botsData[command.message.author.id].indexOf(bot.client.config.token), 1, bot);
							let index = 0;
							for (const bot of botsData[command.message.author.id]) {
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
							command.message.client.utils.sendEmbed(command.message.channel, embed);
						}
						return;
					}
					if (command.args.length == 1) {
						const embed = command.message.client.utils.createEmbed();
						if (cmd == 'addtoken')
							embed.addField(`${command.prefix}${command.command} addtoken <token>`, `${command.message.client.utils.getMessage(command.message.channel, 'bot_help_addtoken')}\n${command.message.client.utils.getMessage(command.message.channel, 'help_token')}`);
						else
							embed.addField(`${command.prefix}${command.command} removetoken <number>`, command.message.client.utils.getMessage(command.message.channel, 'bot_help_removetoken'));
						command.message.client.utils.sendEmbed(command.message.channel, embed);
						return;
					}
					if (cmd == 'addtoken') {
						for (const tokens of Object.values(botsData))
							if (tokens.includes(command.args[1])) {
								command.message.client.utils.sendMessage(command.message.channel, 'error_token_already_registered');
								return;
							}
						if (userData.bot <= botsData[command.message.author.id].length) {
							command.message.client.utils.sendMessage(command.message.channel, 'error_max_bot');
							return;
						}
						const bot = new command.message.client.BotClass({
							owners: [
								command.message.author.id
							],
							token: command.args[1]
						});
						const token = await bot.login().catch(error => {
							command.message.client.utils.sendMessage(command.message.channel, 'error_api', { error });
							return;
						});
						if (!token)
							return;
						botsData[command.message.author.id].push(token);
						command.message.client.utils.savFile('../bots.json', botsData);
						command.message.client.bots.push(bot);
						command.message.client.utils.sendMessage(command.message.channel, 'bot_addtoken', {
							tag: bot.client.user.tag
						});
					} else {
						if (isNaN(command.args[1])) {
							command.message.client.utils.sendMessage(command.message.channel, 'error_nan', {
								arg: command.args[1]
							});
							return;
						}
						const number = parseInt(command.args[1]);
						if (number <= 0 || number > botsData[command.message.author.id].length) {
							command.message.client.utils.sendMessage(command.message.channel, 'error_index_not_found', {
								index: number
							});
							return;
						}
						const token = botsData[command.message.author.id][number - 1];
						let bot = command.message.client.bots.find(bot => bot.client.config.token == token);
						if (bot) {
							command.message.client.bots.splice(command.message.client.bots.indexOf(bot), 1);
							bot.client.emit('exit');
							bot = bot.client.user.tag
						} else
							bot = token;
						botsData[command.message.author.id].splice(number - 1, 1);
						command.message.client.utils.savFile('../bots.json', botsData);
						command.message.client.utils.sendMessage(command.message.channel, 'bot_removetoken', {
							tag: bot
						});
					}
					return;
				}
			}
		}
		if (['setpresence', 'setcolor', 'enable', 'disable'].includes(cmd)
			&& command.message.client.config.owners.includes(command.message.author.id)) {
			const botData = command.message.client.utils.readFile('config.json');
			if (cmd == 'setpresence') {
				if (command.args.length <= 2) {
					const embed = command.message.client.utils.createEmbed();
					embed.addField(`${command.prefix}${command.command} setpresence <type> <message>`, `${command.message.client.utils.getMessage(command.message.channel, 'bot_help_setpresence')}\n${command.message.client.utils.getMessage(command.message.channel, 'bot_help_setpresence_flags')}`);
					command.message.client.utils.sendEmbed(command.message.channel, embed);
					return;
				}
				const type = command.args[1].toLowerCase();
				if (!['playing', 'streaming', 'listening', 'watching', 'competing'].includes(type)) {
					command.message.client.utils.sendMessage(command.message.channel, 'error_type_not_found', { type });
					return;
				}
				let message = '';
				for (let index = 2; index < command.args.length; index++) {
					if (message.length)
						message += ' ';
					message += command.args[index];
				}
				botData.presence = {
					activity: {
						name: message,
						type: type.toUpperCase()
					}
				};
				command.message.client.utils.savFile('config.json', botData);
				command.message.client.config.presence = botData.presence;
				command.message.client.user.setPresence(botData.presence);
				command.message.client.utils.sendMessage(command.message.channel, 'bot_setpresence');
			} else if (cmd == 'setcolor') {
				if (command.args.length == 1) {
					const embed = command.message.client.utils.createEmbed();
					embed.addField(`${command.prefix}${command.command} setcolor <hex>`, `${command.message.client.utils.getMessage(command.message.channel, 'bot_help_setcolor')}\n${command.message.client.utils.getMessage(command.message.channel, 'help_hex_color')}`);
					command.message.client.utils.sendEmbed(command.message.channel, embed);
					return;
				}
				const color = Util.resolveColor(command.args[1]);
				if (isNaN(color)) {
					command.message.client.utils.sendMessage(command.message.channel, 'error_invalid_color');
					return;
				}
				botData.color = color;
				command.message.client.utils.savFile('config.json', botData);
				command.message.client.config.color = botData.color;
				command.message.client.utils.sendMessage(command.message.channel, 'bot_setcolor');
			} else {
				if (command.args.length == 1) {
					const embed = command.message.client.utils.createEmbed();
					if (cmd == 'enable')
						embed.addField(`${command.prefix}${command.command} enable <command>`, command.message.client.utils.getMessage(command.message.channel, 'bot_help_command_enable'));
					else
						embed.addField(`${command.prefix}${command.command} disable <command>`, command.message.client.utils.getMessage(command.message.channel, 'bot_help_command_disable'));
					command.message.client.utils.sendEmbed(command.message.channel, embed);
					return;
				}
				const arg = command.args[1].toLowerCase();
				let _command;
				for (const category of Object.keys(command.message.client.commands))
					for (const instance of Object.values(command.message.client.commands[category]))
						if (instance.name == arg || instance.aliases.includes(arg)) {
							_command = instance.name;
							break;
						}
				if (_command == module.exports.name)
					_command = null;
				if (!_command) {
					command.message.client.utils.sendMessage(command.message.channel, 'error_no_command', {
						command: `${command.prefix}${arg}`
					});
					return;
				}
				if (botData.disable.includes(_command))
					botData.disable.splice(botData.disable.indexOf(_command), 1);
				if (cmd == 'disable')
					botData.disable.push(_command);
				command.message.client.utils.savFile('config.json', botData);
				command.message.client.config.disable = botData.disable;
				if (cmd == 'enable')
					command.message.client.utils.sendMessage(command.message.channel, 'bot_enable', {
						command: _command
					});
				else
					command.message.client.utils.sendMessage(command.message.channel, 'bot_disable', {
						command: _command
					});
			}
			return;
		}
		command.message.client.utils.sendEmbed(command.message.channel, embed);
	},
	permission: (message) => {
		if (message.client.main) {
			if (message.client.config.owners.includes(message.author.id))
				return true;
			const userData = message.client.utils.readFile(`users/${message.author.id}.json`);
			if (userData.bot)
				return true;
		}
		if (message.client.config.owners.includes(message.author.id))
			return true;
		return false;
	}
};