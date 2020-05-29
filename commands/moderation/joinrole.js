/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   joinrole.js                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/27 18:51:27 by ahallain          #+#    #+#             */
/*   Updated: 2020/05/29 13:41:36 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const MessageEmbed = require('discord.js').MessageEmbed;
const utils = require('../../utils.js');

module.exports = {
	name: 'joinrole',
	aliases: ['jr'],
	description: 'Assign roles when someone arrives on the server.',
	privateMessage: false,
	message: (message, object) => {
		if (!object.args.length) {
			utils.sendMessage(message.channel, object.dictionary, 'joinrole_help', {
				'<prefix>': object.prefix
			});
			return;
		}
		const option = object.args[0].toLowerCase();
		if (option == 'help') {
			utils.sendMessage(message.channel, object.dictionary, 'joinrole_help', {
				'<prefix>': object.prefix
			});
			return;
		} else if (option == 'settings') {
			const embed = new MessageEmbed();
			embed.setTitle('JoinRole Settings');
			let roles = '';
			if (object.joinrole && object.joinrole.roles) {
				for (const id of object.joinrole.roles) {
					const role = message.guild.roles.cache.get(id);
					if (!role)
						continue;
					if (roles.length)
						roles += ', ';
					console.log(role);
					roles += `${role}`;
				}
				embed.addField('Roles', roles);
			}
			embed.addField('Restore', object.joinrole && object.joinrole.restore ? true : false);
			utils.sendEmbed(message.channel, object.dictionary, embed);
		} else if (!['add', 'remove', 'restore', 'reset'].includes(option)) {
			let options = '';
			for (const option of ['help', 'add', 'remove', 'restore', 'settings', 'reset']) {
				if (options.length)
					options += ', ';
				options += `\`${option}\``;
			}
			utils.sendMessage(message.channel, object.dictionary, 'error_invalid_option', {
				'<option>': object.args[0],
				'<options>': options
			});
			return;
		}
		if (!message.member.hasPermission('MANAGE_ROLES')) {
			utils.sendMessage(message.channel, object.dictionary, 'error_no_permission', {
				'<permission>': 'MANAGE_ROLES'
			});
			return;
		}
		if (!message.guild.me.hasPermission('MANAGE_ROLES')) {
			utils.sendMessage(message.channel, object.dictionary, 'error_bot_no_permission', {
				'<permission>': 'MANAGE_ROLES'
			});
			return;
		}
		const path = `guilds/${message.guild.id}.json`;
		const loadedObject = utils.readFile(path);
		if (option == 'add') {
			const roles = Array.from(message.mentions.roles.values());
			if (roles.length != 1) {
				utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
					'<format>': `${object.prefix}stats add <role>`
				});
				return;
			}
			const role = roles[0];
			if (!loadedObject.joinrole)
				loadedObject.joinrole = {};
			if (!loadedObject.joinrole.roles)
				loadedObject.joinrole.roles = [];
			loadedObject.joinrole.roles.push(role.id);
			utils.savFile(path, loadedObject);
			utils.sendMessage(message.channel, object.dictionary, 'joinrole_add', {
				'<role>': role
			});
		} else if (option == 'remove') {
			const roles = Array.from(message.mentions.roles.values());
			if (roles.length != 1) {
				utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
					'<format>': `${object.prefix}stats remove <role>`
				});
				return;
			}
			const role = roles[0];
			if (!loadedObject.joinrole)
				loadedObject.joinrole = {};
			if (!loadedObject.joinrole.roles)
				loadedObject.joinrole.roles = [];
			if (!loadedObject.joinrole.roles.includes(role.id)) {
				utils.sendMessage(message.channel, object.dictionary, 'error_joinrole_role_not_found', {
					'<role>': role
				});
				return;
			}
			loadedObject.joinrole.roles.splice(loadedObject.joinrole.roles.indexOf(5), 1);
			utils.savFile(path, loadedObject);
			utils.sendMessage(message.channel, object.dictionary, 'joinrole_remove', {
				'<role>': role
			});
		} else if (option == 'restore') {
			if (object.args.length < 2) {
				utils.sendMessage(message.channel, object.dictionary, 'error_invalid_format', {
					'<format>': `${object.prefix}stats restore <true/false>`
				});
				return;
			}
			if (!['true', 'false'].includes(object.args[1].toLowerCase())) {
				let options = '';
				for (const option of ['true', 'false']) {
					if (options.length)
						options += ', ';
					options += `\`${option}\``;
				}
				utils.sendMessage(message.channel, object.dictionary, 'error_invalid_option', {
					'<option>': object.args[1],
					'<options>': options
				});
				return;
			}
			const bool = object.args[1].toLowerCase() == 'true';
			if (!loadedObject.joinrole)
				loadedObject.joinrole = {};
			loadedObject.joinrole.restore = bool;
			utils.savFile(path, loadedObject);
			utils.sendMessage(message.channel, object.dictionary, 'joinrole_restore', {
				'<bool>': bool
			});
		} else if (option == 'reset') {
			if (!loadedObject.joinrole) {
				utils.sendMessage(message.channel, object.dictionary, 'error_joinrole_no_settings');
				return;
			}
			delete loadedObject.joinrole;
			utils.savFile(path, loadedObject);
			utils.sendMessage(message.channel, object.dictionary, 'joinrole_reset');
		}
	},
	guildMemberAdd: member => {
		if (!member.guild.me.hasPermission('MANAGE_ROLES'))
			return;
		let path = `guilds/${member.guild.id}.json`;
		const loadedObject = utils.readFile(path);
		if (!loadedObject.joinrole)
			return;
		if (loadedObject.joinrole.restore) {
			path = `roles/${member.guild.id}.json`;
			const loadedRoles = utils.readFile(path);
			if (loadedRoles[member.id]) {
				for (const id of loadedRoles[member.id]) {
					const role = member.guild.roles.cache.get(id);
					if (role && role.editable)
						member.roles.add(role);
				}
				delete loadedRoles[member.id];
				utils.savFile(path, loadedRoles);
				return;
			}
		}
		if (loadedObject.joinrole.roles)
			for (const id of loadedObject.joinrole.roles) {
				const role = member.guild.roles.cache.get(id);
				if (role && role.editable)
					member.roles.add(role);
			}
	},
	guildMemberRemove: member => {
		let path = `guilds/${member.guild.id}.json`;
		const loadedObject = utils.readFile(path);
		if (!(loadedObject.joinrole && loadedObject.joinrole.restore))
			return;
		const roles = Array.from(member.roles.cache.keys()).filter(id => id != member.guild.roles.everyone.id);
		path = `roles/${member.guild.id}.json`;
		const loadedRoles = utils.readFile(path);
		loadedRoles[member.id] = roles;
		utils.savFile(path, loadedRoles);
	}
};