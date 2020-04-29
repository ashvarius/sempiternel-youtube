/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   temporary.js                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/23 21:10:35 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/25 03:54:10 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');
const channels = [];

module.exports = {
    name: 'temporary',
    aliases: [],
    description: 'Choose the voice channel that can create a temporary channel.',
    privateMessage: false,
    message: message => {
        if (!message.member.hasPermission('MANAGE_CHANNELS')) {
            utils.sendMessage(message.channel, message.dictionary, 'error_no_permission', {
                '<permission>': 'MANAGE_CHANNELS'
            });
            return;
        }
        if (!message.guild.me.hasPermission('MANAGE_CHANNELS')) {
            utils.sendMessage(message.channel, message.dictionary, 'error_bot_no_permission', {
                '<permission>': 'MANAGE_CHANNELS'
            });
            return;
        }
        if (!message.guild.me.hasPermission('MUTE_MEMBERS')) {
            utils.sendMessage(message.channel, message.dictionary, 'error_bot_no_permission', {
                '<permission>': 'MUTE_MEMBERS'
            });
            return;
        }
        if (!message.guild.me.hasPermission('MOVE_MEMBERS')) {
            utils.sendMessage(message.channel, message.dictionary, 'error_bot_no_permission', {
                '<permission>': 'MOVE_MEMBERS'
            });
            return;
        }
        if (!message.args.length) {
            utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                '<format>': `${message.prefix}temporary <channelId>`
            });
            return;
        }
        const channel = message.guild.channels.cache.get(message.args[0]);
        if (!channel) {
            utils.sendMessage(message.channel, message.dictionary, 'error_temporary_channel_not_found', {
                '<id>': message.args[0]
            });
            return;
        }
        const path = `guilds/${message.guild.id}.json`;
        const object = utils.readFile(path);
        object.temporary = channel.id;
        utils.savFile(path, object);
        utils.sendMessage(message.channel, message.dictionary, 'temporary_success', {
            '<channel>': channel
        });
    },
    voiceStateUpdate: async (oldState, newState) => {
        if (!(newState.guild.me.hasPermission('MANAGE_CHANNELS')
            && newState.guild.me.hasPermission('MUTE_MEMBERS')
            && newState.guild.me.hasPermission('MOVE_MEMBERS')))
            return;
        if (oldState.channelID) {
            const channel = oldState.guild.channels.cache.get(oldState.channelID);
            if (channel && channels.includes(channel.id)
                && !Array.from(channel.members.keys()).length)
                channel.delete('Nobody on the temporary channel');
        }
        const path = `guilds/${newState.guild.id}.json`;
        const object = utils.readFile(path);
        if (!object.temporary || newState.channelID != object.temporary)
            return;
        const channel = newState.guild.channels.cache.get(newState.channelID);
        const options = Object.assign({}, channel);
        options.parent = options.parentID;
        options.reason = 'Creating temporary channel';
        const member = newState.guild.members.cache.get(newState.id);
        const createdChannel = await newState.guild.channels.create(member.displayName, options);
        createdChannel.updateOverwrite(member, {
            MANAGE_CHANNELS: true,
            MUTE_MEMBERS: true,
            MOVE_MEMBERS: true
        }, options.reason);
        newState.setChannel(createdChannel, options.reason);
        channels.push(createdChannel.id);
    },
    channelDelete: channel => {
        if (channel.type == 'voice'
            && channels.includes(channel.id)
            && !Array.from(channel.members.keys()).length)
            channels.splice(channels.indexOf(channel.id), 1);
    },
    restart: async client => {
        for (const guild of client.guilds.cache.values())
            for (const channelId of channels) {
                const channel = guild.channels.cache.get(channelId);
                if (channel)
                    await channel.delete('Restart');
            }
    }
};