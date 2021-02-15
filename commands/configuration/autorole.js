module.exports = {
	name: 'autorole',
	description: 'description_autorole',
	options: [
		{
			type: 1,
			name: 'add',
			description: 'autorole_help_add',
			options: [
				{
					type: 8,
					name: 'role',
					description: 'autorole_help_add',
					required: true
				}
			]
		},
		{
			type: 1,
			name: 'remove',
			description: 'autorole_help_remove',
			options: [
				{
					type: 8,
					name: 'role',
					description: 'autorole_help_remove',
					required: true
				}
			]
		},
		{
			type: 1,
			name: 'restore',
			description: 'autorole_help_restore',
			options: [
				{
					type: 5,
					name: 'boolean',
					description: 'autorole_help_restore',
					required: true
				}
			]
		}
	],
	command: async object => {
		const command = object.options[0].name;
		const guildData = await object.client.utils.readFile(object.client.utils.docRef.collection('guild').doc(object.guild.id));
		if (!guildData.autorole)
			guildData.autorole = {};
		let role;
		if (command == 'restore')
			guildData.autorole.restore = object.options[0].options[0].value;
		else {
			role = await object.guild.roles.fetch(object.options[0].options[0].value);
			if (!guildData.autorole.roles)
				guildData.autorole.roles = [];
			if (command == 'add') {
				if (guildData.autorole.roles.indexOf(role.id) == -1)
					guildData.autorole.roles.push(role.id);
			} else if (!guildData.autorole.roles.indexOf(role.id) != -1)
				guildData.autorole.roles.splice(guildData.autorole.roles.indexOf(role.id), 1);
		}
		object.client.utils.savFile(object.client.utils.docRef.collection('guild').doc(object.guild.id), guildData);
		if (command == 'restore')
			return object.client.utils.getMessage(object.channel, 'autorole_restore', { option: object.options[0].options[0].value });
		if (command == 'add')
			return object.client.utils.getMessage(object.channel, 'autorole_add', { role });
		return object.client.utils.getMessage(object.channel, 'autorole_remove', { role });
	},
	permission: object => {
		if (!object.member.hasPermission('ADMINISTRATOR'))
			return false;
		return true;
	},
	guildMemberAdd: async member => {
		if (!member.guild.me.hasPermission('MANAGE_ROLES'))
			return;
		const guildData = await member.client.utils.readFile(member.client.utils.docRef.collection('guild').doc(member.guild.id));
		if (!guildData.autorole)
			return;
		if (guildData.autorole.restore) {
			const userData = await member.client.utils.readFile(member.client.utils.docRef.collection('users').doc(member.id));
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
	guildMemberRemove: async member => {
		const guildData = await member.client.utils.readFile(member.client.utils.docRef.collection('guild').doc(member.guild.id));
		if (!(guildData.autorole && guildData.autorole.restore))
			return;
		const userData = await member.client.utils.readFile(member.client.utils.docRef.collection('users').doc(member.id));
		if (!userData.autorole)
			userData.autorole = {};
		userData.autorole[member.guild.id] = [];
		const everyone = member.guild.roles.everyone;
		for (const role of member.roles.cache.values())
			if (role != everyone)
				userData.autorole[member.guild.id].push(role.id);
		member.client.utils.savFile(member.client.utils.docRef.collection('users').doc(member.id), userData);
	}
};