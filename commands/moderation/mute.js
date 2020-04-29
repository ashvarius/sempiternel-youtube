/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   mute.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/23 10:53:54 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/26 13:13:12 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const Permissions = require('discord.js').Permissions;
const utils = require('../../utils.js');

module.exports = {
    name: 'mute',
    aliases: [],
    description: 'Prohibit someone\'s messages and speeches.',
    privateMessage: false,
    message: async message => {
        if (!message.member.hasPermission('MUTE_MEMBERS')) {
            utils.sendMessage(message.channel, message.dictionary, 'error_no_permission', {
                '<permission>': 'MUTE_MEMBERS'
            });
            return;
        }
        if (!message.guild.me.hasPermission('MANAGE_ROLES')) {
            utils.sendMessage(message.channel, message.dictionary, 'error_bot_no_permission', {
                '<permission>': 'MANAGE_ROLES'
            });
            return;
        }
        if (!message.guild.me.hasPermission('MANAGE_CHANNELS')) {
            utils.sendMessage(message.channel, message.dictionary, 'error_bot_no_permission', {
                '<permission>': 'MANAGE_CHANNELS'
            });
            return;
        }
        if (!message.args.length) {
            utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                '<format>': `${message.prefix}mute <member...>`
            });
            return;
        }
        const members = Array.from(message.mentions.members.values());
        if (!members.length) {
            utils.sendMessage(message.channel, message.dictionary, 'error_mute_no_member');
            return;
        }
        let role = message.guild.roles.cache.get(message.mute);
        if (!role) {
            await message.guild.roles.fetch();
            role = await message.guild.roles.create({
                data: {
                    name: 'Muted',
                    color: 'RANDOM',
                    hoist: true,
                    permissions: new Permissions()
                },
                reason: 'Mute Command'
            });
            for (const channel of message.guild.channels.cache.values())
                if (['text', 'voice'].includes(channel.type) && channel.manageable)
                    channel.updateOverwrite(role, {
                        SEND_MESSAGES: false,
                        SPEAK: false
                    }, 'Mute Command');
            const path = `guilds/${message.guild.id}.json`;
            const object = utils.readFile(path);
            object.mute = role.id;
            utils.savFile(path, object);
        }
        for (const member of members) {
            if (!member.manageable) {
                utils.sendMessage(message.channel, message.dictionary, 'error_mute_not_manageable', {
                    '<member>': member
                });
                continue;
            }
            if (member.roles.highest.rawPosition >= message.member.roles.highest.rawPosition) {
                utils.sendMessage(message.channel, message.dictionary, 'error_mute_highest', {
                    '<member>': member
                });
                continue;
            }
            if (Array.from(member.roles.cache.keys()).includes(role.id)) {
                member.roles.remove(role);
                utils.sendMessage(message.channel, message.dictionary, 'mute_remove', {
                    '<member>': member
                });
                continue;
            }
            member.roles.add(role);
            utils.sendMessage(message.channel, message.dictionary, 'mute_success', {
                '<member>': member
            });
        }
    },
    channelCreate: channel => {
        if (!['text', 'voice'].includes(channel.type))
            return;
        const path = `guilds/${channel.guild.id}.json`;
        const object = utils.readFile(path);
        const role = channel.guild.roles.cache.get(object.mute);
        if (role)
            channel.updateOverwrite(role, {
                SEND_MESSAGES: false,
                SPEAK: false
            }, 'Mute Role');
    }
};