/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   mention.js                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/23 21:10:35 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/29 02:47:39 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');
const MessageEmbed = require('discord.js').MessageEmbed;

module.exports = {
    name: 'mention',
    aliases: [],
    description: 'Make mentions allowing to have a role.',
    privateMessage: false,
    message: async message => {
        if (!message.member.hasPermission('MANAGE_ROLES')) {
            utils.sendMessage(message.channel, message.dictionary, 'error_no_permission', {
                '<permission>': 'MANAGE_ROLES'
            });
            return;
        }
        if (!message.guild.me.hasPermission('MANAGE_ROLES')) {
            utils.sendMessage(message.channel, message.dictionary, 'error_bot_no_permission', {
                '<permission>': 'MANAGE_ROLES'
            });
            return;
        }
        if (!message.guild.me.hasPermission('ADD_REACTIONS')) {
            utils.sendMessage(message.channel, message.dictionary, 'error_bot_no_permission', {
                '<permission>': 'ADD_REACTIONS'
            });
            return;
        }
        if (!message.guild.me.hasPermission('MANAGE_MESSAGES')) {
            utils.sendMessage(message.channel, message.dictionary, 'error_bot_no_permission', {
                '<permission>': 'MANAGE_MESSAGES'
            });
            return;
        }
        if (!message.args.length) {
            utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                '<format>': `${message.prefix}mention <option>`
            });
            return;
        }
        const option = message.args[0].toLowerCase();
        if (!['set', 'reset', 'force'].includes(option)) {
            let options = '';
            for (const option of ['set', 'reset', 'force']) {
                if (options.length)
                    options += ', ';
                options += `\`${option}\``;
            }
            utils.sendMessage(message.channel, message.dictionary, 'error_invalid_option', {
                '<option>': message.args[0],
                '<options>': options
            });
            return;
        }
        const path = `guilds/${message.guild.id}.json`;
        const object = utils.readFile(path);
        if (option == 'set') {
            if (message.args.length < 3) {
                utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                    '<format>': `${message.prefix}mention set <role> <emoji> [...] [channelId]`
                });
                return;
            }
            const mentions = {};
            let roles = '';
            for (let index = 1; index < message.args.length - 1; index += 2) {
                const role = message.guild.roles.cache.find(role => message.args[index].includes(role.id));
                if (!role) {
                    utils.sendMessage(message.channel, message.dictionary, 'error_mention_role_not_found', {
                        '<role>': message.args[index]
                    });
                    return;
                }
                if (roles.length)
                    roles += '\n';
                roles += `${message.args[index + 1]} - ${role}`;
                mentions[message.args[index + 1]] = role.id;
            }
            const roleMessage = await utils.sendMessage(message.channel, message.dictionary, 'mention_success', {
                '<roles>': roles
            });
            for (const key of Object.keys(mentions)) {
                let emoji = key;
                if (emoji.includes(':') && emoji.includes('>'))
                    emoji = emoji.slice(emoji.lastIndexOf(':') + 1, emoji.lastIndexOf('>'));
                try {
                    emoji = (await roleMessage.react(emoji)).emoji;
                } catch {
                    utils.replaceMessage(roleMessage, message.dictionary, 'error_mention_emoji_not_found', {
                        '<emoji>': key
                    });
                    return;
                }
                const roleId = mentions[key];
                delete mentions[key];
                mentions[emoji.id ? emoji.id : emoji.name] = roleId;
            }
            if (!object.mentionsRole)
                object.mentionsRole = {};
            object.mentionsRole[roleMessage.id] = mentions;
            utils.savFile(path, object);
        } else if (option == 'reset') {
            if (!object.mentionsRole) {
                utils.sendMessage(message.channel, message.dictionary, 'error_mention_already_reset');
                return;
            }
            delete object.mentionsRole;
            utils.savFile(path, object);
            utils.sendMessage(message.channel, message.dictionary, 'mention_reset');
        } else if (option == 'force') {
            if (message.args.length < 2) {
                utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                    '<format>': `${message.prefix}mention force <role>`
                });
                return;
            }
            const role = message.guild.roles.cache.find(role => message.args[1].includes(role.id));
            if (!role) {
                utils.sendMessage(message.channel, message.dictionary, 'error_mention_role_not_found', {
                    '<role>': message.args[1]
                });
                return;
            }
            if (!object.mentionsRole)
                object.mentionsRole = {};
            object.mentionsRole[message.channel.id] = role.id;
            utils.savFile(path, object);
            utils.sendMessage(message.channel, message.dictionary, 'mention_force', {
                '<role>': role,
                '<channel>': message.channel
            });
        }
    },
    messageReactionAdd: (messageReaction, user) => {
        if (messageReaction.message.channel.type == 'dm'
            || user.bot
            || !(messageReaction.message.channel.permissionsFor(messageReaction.message.guild.me).has('MANAGE_ROLES')
                && messageReaction.message.channel.permissionsFor(messageReaction.message.guild.me).has('MANAGE_MESSAGES')))
            return;
        const path = `guilds/${messageReaction.message.guild.id}.json`;
        const object = utils.readFile(path);
        if (!object.mentionsRole)
            return
        const member = messageReaction.message.guild.members.cache.get(user.id);
        if (object.mentionsRole[messageReaction.message.channel.id]) {
            const role = messageReaction.message.guild.roles.cache.get(object.mentionsRole[messageReaction.message.channel.id]);
            if (role) {
                let checked = true;
                for (const message of messageReaction.message.channel.messages.cache.values()) {
                    const reactions = Array.from(message.reactions.cache.values());
                    if (reactions.length)
                        for (const reaction of reactions)
                            if (reaction.users.cache.get(user.id)) {
                                checked = true;
                                break;
                            } else
                                checked = false;
                    if (!checked)
                        break;
                }
                if (checked)
                    member.roles.add(role);
            }
        }
        if (!(object.mentionsRole[messageReaction.message.id]
            && object.mentionsRole[messageReaction.message.id][messageReaction.emoji.id ? messageReaction.emoji.id : messageReaction.emoji.name]))
            return;
        const role = messageReaction.message.guild.roles.cache.get(object.mentionsRole[messageReaction.message.id][messageReaction.emoji.id ? messageReaction.emoji.id : messageReaction.emoji.name]);
        if (!role) {
            messageReaction.users.remove(user);
            return;
        }
        member.roles.add(role);
        for (const emoji of messageReaction.message.reactions.cache.keys())
            if (emoji != (messageReaction.emoji.id ? messageReaction.emoji.id : messageReaction.emoji.name))
                messageReaction.message.reactions.cache.get(emoji).users.remove(user);
    },
    messageReactionRemove: (messageReaction, user) => {
        if (messageReaction.message.channel.type == 'dm'
            || user.bot
            || !(messageReaction.message.channel.permissionsFor(messageReaction.message.guild.me).has('MANAGE_ROLES')
                && messageReaction.message.channel.permissionsFor(messageReaction.message.guild.me).has('MANAGE_MESSAGES')))
            return;
        const path = `guilds/${messageReaction.message.guild.id}.json`;
        const object = utils.readFile(path);
        if (!object.mentionsRole)
            return
        const member = messageReaction.message.guild.members.cache.get(user.id);
        if (object.mentionsRole[messageReaction.message.channel.id]) {
            const role = messageReaction.message.guild.roles.cache.get(object.mentionsRole[messageReaction.message.channel.id]);
            if (role) {
                let checked = true;
                for (const message of messageReaction.message.channel.messages.cache.values()) {
                    const reactions = Array.from(message.reactions.cache.values());
                    if (reactions.length)
                        for (const reaction of reactions)
                            if (reaction.users.cache.get(user.id)) {
                                checked = true;
                                break;
                            } else
                                checked = false;
                    if (!checked)
                        break;
                }
                if (!checked) {
                    for (const memberRole of member.roles.cache.values())
                        if (messageReaction.message.guild.me.roles.highest.rawPosition > memberRole.rawPosition
                            && memberRole.rawPosition > role.rawPosition)
                            member.roles.remove(memberRole);
                    member.roles.remove(role);
                }
            }
        }
        if (!(object.mentionsRole[messageReaction.message.id]
            && object.mentionsRole[messageReaction.message.id][messageReaction.emoji.id ? messageReaction.emoji.id : messageReaction.emoji.name]))
            return;
        const role = messageReaction.message.guild.roles.cache.get(object.mentionsRole[messageReaction.message.id][messageReaction.emoji.id ? messageReaction.emoji.id : messageReaction.emoji.name]);
        if (!role)
            return;
        member.roles.remove(role);
    }
};