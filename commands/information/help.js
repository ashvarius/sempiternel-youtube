module.exports = {
	name: 'help',
	private: true,
	description: 'description_help',
	options: [
		{
			type: 3,
			name: 'string',
			description: 'description_help'
		}
	],
	command: object => {
		if (object.options.length) {
			const command = object.options[0].value.toLowerCase();
			for (const category of Object.keys(object.client.commands))
				for (const instance of Object.values(object.client.commands[category]))
					if (!object.client.config.disable.includes(instance.name))
						if (instance.name == command) {
							const embed = object.client.utils.createEmbed();
							embed.addField(object.client.utils.getMessage(object.channel, 'name'), `\`${instance.name}\``);
							embed.addField(object.client.utils.getMessage(object.channel, 'description'), object.client.utils.getMessage(object.channel, instance.description));
							return embed;
						}
			return object.client.utils.getMessage(object.channel, 'error_no_command', { command });
		} else {
			const commands = {};
			for (const category of Object.keys(object.client.commands))
				for (const instance of Object.values(object.client.commands[category]))
					if (!object.client.config.disable.includes(instance.name)
						&& (object.channel.type != 'dm'
							|| instance.private)
						&& (object.client.config.owners.includes(object.user.id)
							|| !instance.permission
							|| instance.permission(object))) {
						if (!commands[category])
							commands[category] = {
								count: 0,
								list: []
							};
						commands[category].count++;
						commands[category].list.push(`\`${instance.name}\``);
					}
			const embed = object.client.utils.createEmbed();
			for (const category of Object.keys(commands))
				embed.addFields({
					name: `${object.client.utils.getMessage(object.channel, category)} (\`${commands[category].count}\`)`,
					value: commands[category].list.join(', '),
					inline: true
				});
			return embed;
		}
	}
};