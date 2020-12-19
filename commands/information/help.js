module.exports = {
	name: 'help',
	aliases: [],
	private: true,
	description: 'description_help',
	command: command => {
		if (!command.args.length) {
			const private = command.message.channel.type == 'dm';
			const commands = {};
			for (const category of Object.keys(command.message.client.commands))
				for (const instance of Object.values(command.message.client.commands[category]))
					if (!command.message.client.config.disable.includes(instance.name)
						&& (!private
							|| instance.private)
						&& (command.message.client.config.owners.includes(command.message.author.id)
							|| !instance.permission
							|| instance.permission(command.message))) {
						if (!commands[category])
							commands[category] = {
								count: 0,
								list: []
							};
						commands[category].count++;
						commands[category].list.push(`\`${instance.name}\``);
					}
			const embed = command.message.client.utils.createEmbed();
			for (const category of Object.keys(commands))
				embed.addField(`**${command.message.client.utils.getMessage(command.message.channel, category)}** (\`${commands[category].count}\`)`, commands[category].list.join(', '));
			command.message.client.utils.sendEmbed(command.message.channel, embed);
		} else {
			const cmd = command.args[0].toLowerCase();
			for (const category of Object.keys(command.message.client.commands))
				for (const instance of Object.values(command.message.client.commands[category]))
					if (!command.message.client.config.disable.includes(instance.name))
						if (instance.name == cmd || instance.aliases.includes(cmd)) {
							const embed = command.message.client.utils.createEmbed();
							embed.addField(command.message.client.utils.getMessage(command.message.channel, 'name'), `\`${instance.name}\``);
							embed.addField(command.message.client.utils.getMessage(command.message.channel, 'aliases'), instance.aliases.length ? `\`${instance.aliases.join('`, `')}\`` : command.message.client.utils.getMessage(command.message.channel, 'nothing'));
							embed.addField(command.message.client.utils.getMessage(command.message.channel, 'description'), command.message.client.utils.getMessage(command.message.channel, instance.description));
							command.message.client.utils.sendEmbed(command.message.channel, embed);
							return;
						}
			command.message.client.utils.sendMessage(command.message.channel, 'error_no_command', { command: cmd });
		}
	}
};