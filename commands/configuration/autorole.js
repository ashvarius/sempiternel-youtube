module.exports = {
	name: 'autorole',
	description: 'description_autorole',
	permissions: ['MANAGE_ROLES'],
	options: [
		{
			type: 1,
			name: 'add',
			description: 'autorole_help_add',
			options: [
				{
					type: 8,
					name: 'role1',
					description: 'autorole_help_add',
					required: true
				},
				{
					type: 8,
					name: 'role2',
					description: 'autorole_help_add',
				},
				{
					type: 8,
					name: 'role3',
					description: 'autorole_help_add',
				},
				{
					type: 8,
					name: 'role4',
					description: 'autorole_help_add',
				},
				{
					type: 8,
					name: 'role5',
					description: 'autorole_help_add',
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
					name: 'role1',
					description: 'autorole_help_remove',
					required: true
				},
				{
					type: 8,
					name: 'role2',
					description: 'autorole_help_remove',
				},
				{
					type: 8,
					name: 'role3',
					description: 'autorole_help_remove',
				},
				{
					type: 8,
					name: 'role4',
					description: 'autorole_help_remove',
				},
				{
					type: 8,
					name: 'role5',
					description: 'autorole_help_remove',
				}
			]
		},
		{
			type: 1,
			name: 'list',
			description: 'autorole_help_list'
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
		const guildData = await object.client.utils.readFile(object.client.utils.docRef.collection('guild').doc(object.guild.id));
		if (!guildData.autorole)
			guildData.autorole = {};
		if (object.options[0].name == 'list') {
			const roles = [];
			if (guildData.autorole.roles)
				for (const id of guildData.autorole.roles) {
					const role = object.guild.roles.cache.get(id);
					if (role)
						roles.push(role.toString());
				}
			return object.client.utils.getMessage(object.channel, 'autorole_list', { list: roles.join(', ') });
		}
		let role;
		if (object.options[0].name == 'restore')
			guildData.autorole.restore = object.options[0].options[0].value;
		else {
			if (!guildData.autorole.roles)
				guildData.autorole.roles = [];
			for (const option of object.options[0].options) {
				role = await object.guild.roles.fetch(option.value);
				if (object.options[0].name == 'add') {
					if (guildData.autorole.roles.indexOf(role.id) == -1)
						guildData.autorole.roles.push(role.id);
				} else if (!guildData.autorole.roles.indexOf(role.id) != -1)
					guildData.autorole.roles.splice(guildData.autorole.roles.indexOf(role.id), 1);
			}
		}
		object.client.utils.savFile(object.client.utils.docRef.collection('guild').doc(object.guild.id), guildData);
		if (object.options[0].name == 'restore')
			return object.client.utils.getMessage(object.channel, 'autorole_restore', { option: object.options[0].options[0].value });
		if (object.options[0].name == 'add')
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
			const userData = await member.client.utils.readFile(member.client.utils.docRef.collection('user').doc(member.id));
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
		const userData = await member.client.utils.readFile(member.client.utils.docRef.collection('user').doc(member.id));
		if (!userData.autorole)
			userData.autorole = {};
		userData.autorole[member.guild.id] = [];
		const everyone = member.guild.roles.everyone;
		for (const role of member.roles.cache.values())
			if (role != everyone)
				userData.autorole[member.guild.id].push(role.id);
		member.client.utils.savFile(member.client.utils.docRef.collection('user').doc(member.id), userData);
	}
};