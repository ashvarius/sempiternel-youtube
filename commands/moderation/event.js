/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   event.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/27 18:51:27 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/28 22:32:45 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const MessageEmbed = require('discord.js').MessageEmbed;
const utils = require('../../utils.js');
const events = ['join', 'leave'];
const args = ['<user>', '<displayname>', '<tag>'];

const getLogChannel = (guild) => {
    const path = `guilds/${guild.id}.json`;
    const object = utils.readFile(path);
    if (!(object.events && object.events.log))
        return;
    const log = guild.channels.cache.get(object.events.log);
    return log;
};
const getDictionary = (guild) => {
    const path = `guilds/${guild.id}.json`;
    const object = utils.readFile(path);
    if (!object.dictionary)
        object.dictionary = guild.client._config.dictionary;
    const dictionary = guild.client._dictionaries[object.dictionary];
    if (object.customDictionary) {
        for (const key of Object.keys(object.customDictionary))
            dictionary[key] = object.customDictionary[key];
        object.dictionary += ' (custom)';
    }
    return dictionary;
};

module.exports = {
    name: 'event',
    aliases: [],
    description: 'Manage events on the server.',
    privateMessage: false,
    message: message => {
        if (!message.member.hasPermission('MANAGE_MESSAGES')) {
            utils.sendMessage(message.channel, message.dictionary, 'error_no_permission', {
                '<permission>': 'MANAGE_MESSAGES'
            });
            return;
        }
        if (!message.args.length) {
            utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                '<format>': `${message.prefix}event <option>`
            });
            return;
        }
        const option = message.args[0].toLowerCase();
        if (!['set', 'reset', 'log'].includes(option)) {
            let options = '';
            for (const option of ['set', 'reset', 'log']) {
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
            if (message.args.length < 2) {
                utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                    '<format>': `${message.prefix}event set <event> <type>`
                });
                return;
            }
            const event = message.args[1].toLowerCase();
            if (!events.includes(event)) {
                let options = '';
                for (const option of events) {
                    if (options.length)
                        options += ', ';
                    options += `\`${option}\``;
                }
                utils.sendMessage(message.channel, message.dictionary, 'error_invalid_option', {
                    '<option>': message.args[1],
                    '<options>': options
                });
                return;
            }
            if (message.args.length < 3) {
                utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                    '<format>': `${message.prefix}event set ${event} <type>`
                });
                return;
            }
            const type = message.args[2].toLowerCase();
            if (!['role', 'message'].includes(type)) {
                let options = '';
                for (const option of ['role', 'message']) {
                    if (options.length)
                        options += ', ';
                    options += `\`${option}\``;
                }
                utils.sendMessage(message.channel, message.dictionary, 'error_invalid_option', {
                    '<option>': message.args[2],
                    '<options>': options
                }); getLogChannel
                return;
            }
            let value;
            if (type == 'role') {
                if (message.args.length < 4) {
                    utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                        '<format>': `${message.prefix}event set ${event} ${type} <role>`
                    });
                    return;
                }
                const roles = Array.from(message.mentions.roles.values());
                if (roles.length != 1) {
                    utils.sendMessage(message.channel, message.dictionary, 'error_event_role_not_one');
                    return;
                }
                value = roles[0];
            } else {
                if (message.args.length < 4) {
                    utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                        '<format>': `${message.prefix}event set ${event} ${type} <message...>`
                    });
                    return;
                }
                let inputMessage = '';
                for (let index = 3; index < message.args.length; index++) {
                    if (inputMessage.length)
                        inputMessage += ' ';
                    inputMessage += message.args[index];
                }
                for (let arg of args)
                    if (inputMessage.includes(arg)) {
                        value = {
                            channel: message.channel.id,
                            message: inputMessage
                        };
                        break;
                    }
                if (!value) {
                    utils.sendMessage(message.channel, message.dictionary, 'error_event_no_custom_arg', {
                        '<args>': `\`${args.join('\`, \`')}\``
                    });
                    return;
                }
            }
            if (!object.events)
                object.events = {};
            if (!object.events[event])
                object.events[event] = {};
            object.events[event][type] = value.id ? value.id : value;
            utils.savFile(path, object);
            utils.sendMessage(message.channel, message.dictionary, 'event_set', {
                '<event>': event,
                '<type>': type,
                '<value>': value.message ? value.message : value
            });
        } else if (option == 'reset') {
            if (!object.events) {
                utils.sendMessage(message.channel, message.dictionary, 'error_event_already_reset');
                return;
            }
            delete object.events;
            utils.savFile(path, object);
            utils.sendMessage(message.channel, message.dictionary, 'event_reset');
        } else if (option == 'log') {
            if (!object.events)
                object.events = {};
            object.events.log = message.channel.id;
            utils.savFile(path, object);
            utils.sendMessage(message.channel, message.dictionary, 'event_log', {
                '<channel>': message.channel
            });
        }
    },
    channelCreate: channel => {
        if (channel.type == 'dm')
            return;
        const log = getLogChannel(channel.guild);
        if (!log)
            return;
        const dictionary = getDictionary(channel.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_channelCreate', {
            '<name>': channel.name,
            '<type>': channel.type
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    channelDelete: channel => {
        if (channel.type == 'dm')
            return;
        const log = getLogChannel(channel.guild);
        if (!log)
            return;
        const dictionary = getDictionary(channel.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_channelDelete', {
            '<name>': channel.name,
            '<type>': channel.type
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    channelPinsUpdate: channel => {
        if (channel.type == 'dm')
            return;
        const log = getLogChannel(channel.guild);
        if (!log)
            return;
        const dictionary = getDictionary(channel.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_channelPinsUpdate', {
            '<name>': channel.name,
            '<type>': channel.type
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    channelUpdate: (oldChannel, newChannel) => {
        if (newChannel.type == 'dm')
            return;
        const log = getLogChannel(newChannel.guild);
        if (!log)
            return;
        const dictionary = getDictionary(newChannel.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_channelUpdate', {
            '<name>': newChannel.name,
            '<type>': newChannel.type
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    emojiCreate: (emoji) => {
        const log = getLogChannel(emoji.guild);
        if (!log)
            return;
        const dictionary = getDictionary(emoji.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_emojiCreate', {
            '<name>': emoji.name
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    emojiDelete: (emoji) => {
        const log = getLogChannel(emoji.guild);
        if (!log)
            return;
        const dictionary = getDictionary(emoji.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_emojiDelete', {
            '<name>': emoji.name
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    emojiUpdate: (oldEmoji, newEmoji) => {
        const log = getLogChannel(newEmoji.guild);
        if (!log)
            return;
        const dictionary = getDictionary(newEmoji.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_emojiUpdate', {
            '<oldName>': oldEmoji.name,
            '<newName>': newEmoji.name
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    guildBanAdd: (guild, user) => {
        const log = getLogChannel(guild);
        if (!log)
            return;
        const dictionary = getDictionary(guild);
        const embed = utils.getEmbed(dictionary, 'event_log_guildBanAdd', {
            '<tag>': user.tag
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    guildBanRemove: (guild, user) => {
        const log = getLogChannel(guild);
        if (!log)
            return;
        const dictionary = getDictionary(guild);
        const embed = utils.getEmbed(dictionary, 'event_log_guildBanRemove', {
            '<tag>': user.tag
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    guildIntegrationsUpdate: guild => {
        const log = getLogChannel(guild);
        if (!log)
            return;
        const dictionary = getDictionary(guild);
        const embed = utils.getEmbed(dictionary, 'event_log_guildIntegrationsUpdate');
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    guildMemberAdd: member => {
        const path = `guilds/${member.guild.id}.json`;
        const object = utils.readFile(path);
        const dictionary = getDictionary(member.guild);
        if (object.events && object.events.join) {
            if (object.events.join.role) {
                const role = member.guild.roles.cache.get(object.events.join.role);
                if (role)
                    member.roles.add(role);
            }
            if (object.events.join.message) {
                const message = object.events.join.message;
                const channel = member.guild.channels.cache.get(message.channel);
                if (channel) {
                    let description = message.message;
                    const editObject = {
                        '<user>': member.user,
                        '<displayname>': member.displayName,
                        '<tag>': member.user.tag,
                    };
                    for (const objectKey of Object.keys(editObject))
                        description = `${description}`.replace(new RegExp(objectKey, 'g'), editObject[objectKey]);
                    utils.sendEmbed(channel, dictionary, new MessageEmbed().setDescription(description));
                }
            }
        }
        const log = getLogChannel(member.guild);
        if (!log)
            return;
        const embed = utils.getEmbed(dictionary, 'event_log_guildMemberAdd');
        embed.setAuthor(member.user.tag, member.user.displayAvatarURL({
            dynamic: true,
            size: 4096
        }));
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    guildMemberRemove: member => {
        const path = `guilds/${member.guild.id}.json`;
        const object = utils.readFile(path);
        const dictionary = getDictionary(member.guild);
        if (object.events && object.events.leave && object.events.leave.message) {
            const message = object.events.leave.message;
            const channel = member.guild.channels.cache.get(message.channel);
            if (channel) {
                let description = message.message;
                const editObject = {
                    '<user>': member.user,
                    '<displayname>': member.displayName,
                    '<tag>': member.user.tag,
                };
                for (const objectKey of Object.keys(editObject))
                    description = `${description}`.replace(new RegExp(objectKey, 'g'), editObject[objectKey]);
                utils.sendEmbed(channel, dictionary, new MessageEmbed().setDescription(description));
            }
        }
        const log = getLogChannel(member.guild);
        if (!log)
            return;
        const embed = utils.getEmbed(dictionary, 'event_log_guildMemberRemove');
        embed.setAuthor(member.user.tag, member.user.displayAvatarURL({
            dynamic: true,
            size: 4096
        }));
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    guildMemberUpdate: (oldMember, newMember) => {
        const log = getLogChannel(newMember.guild);
        if (!log)
            return;
        const dictionary = getDictionary(newMember.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_guildMemberUpdate');
        embed.setAuthor(newMember.user.tag, newMember.user.displayAvatarURL({
            dynamic: true,
            size: 4096
        }));
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    guildUpdate: (oldGuild, newGuild) => {
        const log = getLogChannel(newGuild);
        if (!log)
            return;
        const dictionary = getDictionary(newGuild);
        const embed = utils.getEmbed(dictionary, 'event_log_guildUpdate');
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    inviteCreate: invite => {
        const log = getLogChannel(invite.guild);
        if (!log)
            return;
        const dictionary = getDictionary(invite.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_inviteCreate', {
            '<url>': invite.url,
            '<maxAge>': invite.maxAge,
            '<maxUses>': invite.maxUses
        });
        embed.setAuthor(invite.inviter.tag, invite.inviter.displayAvatarURL({
            dynamic: true,
            size: 4096
        }));
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    inviteDelete: invite => {
        const log = getLogChannel(invite.guild);
        if (!log)
            return;
        const dictionary = getDictionary(invite.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_inviteDelete', {
            '<code>': invite.code
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    messageDelete: message => {
        if (message.channel.type == 'dm'
            || message.type != 'DEFAULT')
            return;
        const log = getLogChannel(message.guild);
        if (!log)
            return;
        const dictionary = getDictionary(message.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_messageDelete', {
            '<content>': message.embeds.length ? message.embeds[0].description : message.content,
            '<channel>': message.channel
        });
        if (message.author)
            embed.setAuthor(message.author.tag, message.author.displayAvatarURL({
                dynamic: true,
                size: 4096
            }));
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    messageDeleteBulk: messages => {
        messages = Array.from(messages.values());
        const firstMessage = messages[0];
        if (firstMessage.type != 'DEFAULT')
            return;
        const log = getLogChannel(firstMessage.guild);
        if (!log)
            return;
        const dictionary = getDictionary(firstMessage.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_messageDeleteBulk', {
            '<length>': messages.length,
            '<channel>': firstMessage.channel
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    messageReactionRemoveAll: message => {
        if (message.type != 'DEFAULT')
            return;
        const log = getLogChannel(message.guild);
        if (!log)
            return;
        const dictionary = getDictionary(message.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_messageReactionRemoveAll', {
            '<content>': message.embeds.length ? message.embeds[0].description : message.content,
            '<channel>': message.channel,
            '<url>': message.url
        });
        if (message.author)
            embed.setAuthor(message.author.tag, message.author.displayAvatarURL({
                dynamic: true,
                size: 4096
            }));
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    messageUpdate: (oldMessage, newMessage) => {
        if (newMessage.author.bot
            || newMessage.type != 'DEFAULT')
            return;
        const log = getLogChannel(newMessage.guild);
        if (!log)
            return;
        const dictionary = getDictionary(newMessage.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_messageUpdate', {
            '<oldContent>': oldMessage.content,
            '<newContent>': newMessage.content,
            '<channel>': newMessage.channel,
            '<url>': newMessage.url
        });
        if (newMessage.author)
            embed.setAuthor(newMessage.author.tag, newMessage.author.displayAvatarURL({
                dynamic: true,
                size: 4096
            }));
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    presenceUpdate: (oldPresence, newPresence) => {
        const log = getLogChannel(newPresence.guild);
        if (!log)
            return;
        const dictionary = getDictionary(newPresence.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_presenceUpdate');
        embed.setAuthor(newPresence.user.tag, newPresence.user.displayAvatarURL({
            dynamic: true,
            size: 4096
        }));
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    roleCreate: role => {
        const log = getLogChannel(role.guild);
        if (!log)
            return;
        const dictionary = getDictionary(role.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_roleCreate', {
            '<role>': role
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    roleDelete: role => {
        const log = getLogChannel(role.guild);
        if (!log)
            return;
        const dictionary = getDictionary(role.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_roleDelete', {
            '<name>': role.name
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    roleUpdate: role => {
        const log = getLogChannel(role.guild);
        if (!log)
            return;
        const dictionary = getDictionary(role.guild);
        const embed = utils.getEmbed(dictionary, 'event_log_roleUpdate', {
            '<role>': role
        });
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    },
    voiceStateUpdate: (oldState, newState) => {
        const log = getLogChannel(newState.guild);
        if (!log)
            return;
        const dictionary = getDictionary(newState.guild);
        let embed;
        if (!newState.channel)
            embed = utils.getEmbed(dictionary, 'event_log_voiceRemove', {
                '<channel>': oldState.channel
            });
        else if (!oldState.channel)
            embed = utils.getEmbed(dictionary, 'event_log_voiceAdd', {
                '<channel>': newState.channel
            });
        else
            embed = utils.getEmbed(dictionary, 'event_log_voiceUpdate', {
                '<oldChannel>': oldState.channel,
                '<newChannel>': newState.channel
            });
        embed.setAuthor(newState.member.user.tag, newState.member.user.displayAvatarURL({
            dynamic: true,
            size: 4096
        }));
        embed.setTimestamp();
        utils.sendEmbed(log, dictionary, embed);
    }
};