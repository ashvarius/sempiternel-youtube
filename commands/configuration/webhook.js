const Canvas = require('canvas');

module.exports = {
	name: 'webhook',
	aliases: [],
	description: 'description_webhook',
	command: async command => {
		if (!command.message.guild.me.hasPermission('MANAGE_WEBHOOKS')) {
			command.message.client.utils.sendMessage(command.message.channel, 'error_bot_no_permission', {
				permission: 'MANAGE_WEBHOOKS'
			});
			return;
		}
		const cmd = command.args.length && command.args[0].toLowerCase();
		if (!['on', 'off', 'setname', 'setavatar'].includes(cmd)) {
			const embed = command.message.client.utils.createEmbed();
			embed.addField(`${command.prefix}${command.command} <on/off>`, command.message.client.utils.getMessage(command.message.channel, 'webhook_help_activation'));
			embed.addField(`${command.prefix}${command.command} setname <name>`, command.message.client.utils.getMessage(command.message.channel, 'webhook_help_setname'));
			embed.addField(`${command.prefix}${command.command} setavatar <url>`, command.message.client.utils.getMessage(command.message.channel, 'webhook_help_setavatar'));
			command.message.client.utils.sendEmbed(command.message.channel, embed);
			return;
		}
		const guildData = command.message.client.utils.readFile(`guilds/${command.message.guild.id}.json`);
		if (!guildData.webhook)
			guildData.webhook = {};
		if (['on', 'off'].includes(cmd)) {
			let webhook;
			if (guildData.webhook.id)
				webhook = await command.message.client.fetchWebhook(guildData.webhook.id).catch(() => { });
			if (!command.message.guild.me.permissionsIn((webhook && webhook.channelID) || command.message.channel).has('MANAGE_WEBHOOKS')) {
				command.message.client.utils.sendMessage(command.message.channel, 'error_bot_no_permission', {
					permission: 'MANAGE_WEBHOOKS'
				});
				return;
			}
			if (cmd == 'on' && !webhook) {
				if (command.message.channel.permissionsFor(command.message.guild.me).has('MANAGE_WEBHOOKS'))
					webhook = await command.message.channel.createWebhook(guildData.webhook.name || command.message.client.user.username, {
						avatar: guildData.webhook.avatar || command.message.client.user.displayAvatarURL({
							dynamic: true,
							size: 4096
						}),
						reason: 'Activation of the webhook.'
					});
				command.message.guild.webhook = webhook;
				guildData.webhook.id = webhook.id;
			} else if (cmd == 'off' && webhook) {
				await webhook.delete();
				delete command.message.guild.webhook;
				delete guildData.webhook.id;
			}
			command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
			command.message.client.utils.sendMessage(command.message.channel, `webhook_activation_${cmd}`);
		} else if (cmd == 'setname') {
			if (command.args.length == 1) {
				const embed = command.message.client.utils.createEmbed();
				embed.addField(`${command.prefix}${command.command} ${command.args[0]} <name>`, command.message.client.utils.getMessage(command.message.channel, 'webhook_help_setname'));
				command.message.client.utils.sendEmbed(command.message.channel, embed);
				return;
			}
			const name = command.args.slice(1).join(' ');
			if (name.length > 80) {
				command.message.client.utils.sendMessage(command.message.channel, 'error_too_large', {
					type: command.message.client.utils.getMessage(command.message.channel, 'name'),
					max: '80 characters'
				});
				return;
			}
			if (command.message.guild.webhook)
				await command.message.guild.webhook.edit({ name });
			guildData.webhook.name = name;
			command.message.client.utils.sendMessage(command.message.channel, 'webhook_setname');
		} else {
			if (command.args.length == 1) {
				const embed = command.message.client.utils.createEmbed();
				embed.addField(`${command.prefix}${command.command} ${command.args[0]} <url>`, command.message.client.utils.getMessage(command.message.channel, 'webhook_help_setavatar'));
				command.message.client.utils.sendEmbed(command.message.channel, embed);
				return;
			}
			const url = command.args[1];
			try {
				new URL(url);
				await Canvas.loadImage(url);
			} catch (error) {
				command.message.client.utils.sendMessage(command.message.channel, 'error_api', { error: error.message });
				return;
			}
			if (command.message.guild.webhook)
				await command.message.guild.webhook.edit({ avatar: url });
			command.message.client.utils.sendMessage(command.message.channel, 'bot_setavatar');
		}
	},
	permission: (message) => {
		if (!message.member.hasPermission('ADMINISTRATOR'))
			return false;
		return true;
	},
	ready: async (client) => {
		for (const guild of client.guilds.cache.values()) {
			const guildData = client.utils.readFile(`guilds/${guild.id}.json`);
			if (!(guildData.webhook && guildData.webhook.id))
				continue;
			const webhook = await client.fetchWebhook(guildData.webhook.id).catch(() => { });
			if (webhook)
				guild.webhook = webhook;
		}
	}
}; 