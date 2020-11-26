module.exports = {
	name: 'autorole',
	aliases: [],
	command: command => {
		if (!command.args.length || !['add', 'remove', 'restore'].includes(command.args[0].toLowerCase())) {
			const embed = command.message.client.utils.createEmbed();
			embed.addField(`${command.prefix}${command.command} add <role>`, command.message.client.utils.getMessage(command.message.channel, 'autorole_help_add'));
			embed.addField(`${command.prefix}${command.command} remove <role>`, command.message.client.utils.getMessage(command.message.channel, 'autorole_help_remove'));
			embed.addField(`${command.prefix}${command.command} restore <yes/no>`, command.message.client.utils.getMessage(command.message.channel, 'autorole_help_restore'));
			command.message.client.utils.sendEmbed(command.message.channel, embed);
			return;
		}
		const cmd = command.args[0].toLowerCase();
		if (cmd == 'restore') {
			const option = command.args[1] ? command.args[1].toLowerCase() : null;
			if (!['yes', 'no'].includes(option)) {
				const embed = command.message.client.utils.createEmbed();
				embed.addField(`${command.prefix}${command.command} restore <yes/no>`, command.message.client.utils.getMessage(command.message.channel, 'autorole_help_restore'));
				command.message.client.utils.sendEmbed(command.message.channel, embed);
				return;
			}
			const guildData = command.message.client.utils.readFile(`guilds/${command.message.guild.id}.json`);
			if (!guildData.autorole)
				guildData.autorole = {};
			guildData.autorole.restore = option == 'yes';
			command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
			command.message.client.utils.sendMessage(command.message.channel, 'autorole_restore', { option });
		} else {
			if (Array.from(command.message.mentions.roles.values()).length != 1) {
				const embed = command.message.client.utils.createEmbed();
				if (cmd == 'add')
					embed.addField(`${command.prefix}${command.command} add <role>`, command.message.client.utils.getMessage(command.message.channel, 'autorole_help_add'));
				else
					embed.addField(`${command.prefix}${command.command} remove <role>`, command.message.client.utils.getMessage(command.message.channel, 'autorole_help_remove'));
				command.message.client.utils.sendEmbed(command.message.channel, embed);
				return;
			}
			const role = Array.from(command.message.mentions.roles.values())[0];
			const guildData = command.message.client.utils.readFile(`guilds/${command.message.guild.id}.json`);
			if (!guildData.autorole)
				guildData.autorole = {};
			if (!guildData.autorole.roles)
				guildData.autorole.roles = [];
			if (cmd == 'add') {
				if (guildData.autorole.roles.indexOf(role.id) == -1)
					guildData.autorole.roles.push(role.id);
			} else if (!guildData.autorole.roles.indexOf(role.id) != -1)
				guildData.autorole.roles.splice(guildData.autorole.roles.indexOf(role.id), 1);
			command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
			if (cmd == 'add')
				command.message.client.utils.sendMessage(command.message.channel, 'autorole_add', { role });
			else
				command.message.client.utils.sendMessage(command.message.channel, 'autorole_remove', { role });
		}
	},
	permission: (message) => {
		if (!message.member.hasPermission('ADMINISTRATOR'))
			return false;
		return true;
	},
	guildMemberAdd: member => {
		if (!member.guild.me.hasPermission('MANAGE_ROLES'))
			return
		const guildData = member.client.utils.readFile(`guilds/${member.guild.id}.json`);
		if (!guildData.autorole)
			return;
		if (guildData.autorole.restore) {
			const userData = member.client.utils.readFile(`users/${member.id}.json`);
			if (!userData.autorole)
				userData.autorole = {};
			if (userData.autorole[member.guild.id]) {
				for (const id of userData.autorole[member.guild.id]) {
					const role = member.guild.roles.cache.get(id);
					if (role)
						member.roles.add(role);
				}
				return;
			}
		}
		if (!guildData.autorole.roles)
			return;
		for (const id of guildData.autorole.roles) {
			const role = member.guild.roles.cache.get(id);
			if (role)
				member.roles.add(role);
		}
	},
	guildMemberRemove: member => {
		const guildData = member.client.utils.readFile(`guilds/${member.guild.id}.json`);
		if (!(guildData.autorole && guildData.autorole.restore))
			return;
		const userData = member.client.utils.readFile(`users/${member.id}.json`);
		if (!userData.autorole)
			userData.autorole = {};
		userData.autorole[member.guild.id] = [];
		const everyone = member.guild.roles.everyone;
		for (const role of member.roles.cache.values())
			if (role != everyone)
				userData.autorole[member.guild.id].push(role.id);
		member.client.utils.savFile(`users/${member.id}.json`, userData);
	}
};