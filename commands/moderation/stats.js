/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   stats.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/27 16:10:35 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/27 18:59:33 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
    name: 'stats',
    aliases: [],
    description: 'Make statistics on the server.',
    privateMessage: false,
    message: async message => {
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
        if (!message.args.length) {
            utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                '<format>': `${message.prefix}stats <option>`
            });
            return;
        }
        const option = message.args[0].toLowerCase();
        if (!['add', 'reset'].includes(option)) {
            let options = '';
            for (const option of ['add', 'reset']) {
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
        if (option == 'add') {
            if (message.args.length < 3) {
                utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                    '<format>': `${message.prefix}stats add <type> <name...>`
                });
                return;
            }
            const type = message.args[1].toLowerCase();
            if (!['member', 'human', 'bot', 'online', 'online_human', 'online_bot', 'voice', 'voice_human', 'voice_bot'].includes(type)) {
                let options = '';
                for (const option of ['member', 'human', 'bot', 'online', 'online_human', 'online_bot', 'voice', 'voice_human', 'voice_bot']) {
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
            let name = '';
            for (let index = 2; index < message.args.length; index++) {
                const word = message.args[index];
                if (name.length)
                    name += ' ';
                name += word;
            }
            if (name.length > 100) {
                utils.sendMessage(message.channel, message.dictionary, 'error_stats_too_big');
                return;
            }
            if (!name.includes('<count>')) {
                utils.sendMessage(message.channel, message.dictionary, 'error_stats_no_count', {
                    '<name>': name,
                    '<arg>': '<count>'
                });
                return;
            }
            const channel = await message.guild.channels.create(name, {
                type: 'voice',
                permissionOverwrites: [
                    {
                        id: message.guild.me.id,
                        allow: ['CONNECT'],
                    },
                    {
                        id: message.guild.roles.everyone.id,
                        deny: ['CONNECT'],
                    }
                ],
                reason: 'A statistic created.'
            });
            if (!object.stats)
                object.stats = {};
            object.stats[channel.id] = {
                name,
                type
            };
            utils.savFile(path, object);
            utils.sendMessage(message.channel, message.dictionary, 'stats_add', {
                '<channel>': channel,
                '<type>': type
            });
        } else if (option == 'reset') {
            if (!object.stats) {
                utils.sendMessage(message.channel, message.dictionary, 'error_stats_not_define');
                return;
            }
            for (const id of Object.keys(object.stats)) {
                const channel = message.guild.channels.cache.get(id);
                if (channel && channel.manageable)
                    channel.delete('Reset statistics');
                delete object.stats[id];
            }
            utils.savFile(path, object);
            utils.sendMessage(message.channel, message.dictionary, 'stats_reset');
        }
    },
    ready: client => {
        const update = () => {
            for (const guild of client.guilds.cache.values()) {
                const path = `guilds/${guild.id}.json`;
                const object = utils.readFile(path);
                if (!object.stats)
                    continue;
                const stats = {
                    member: 0,
                    human: 0,
                    bot: 0,
                    online: 0,
                    online_human: 0,
                    online_bot: 0,
                    voice: 0,
                    voice_human: 0,
                    voice_bot: 0,
                };
                for (const member of guild.members.cache.values()) {
                    stats.member++;
                    if (member.user.bot)
                        stats.bot++;
                    else
                        stats.human++;
                    if (member.presence.activities.length) {
                        stats.online++;
                        if (member.user.bot)
                            stats.online_bot++;
                        else
                            stats.online_human++;
                    }
                    if (member.voice.channelID) {
                        stats.voice++;
                        if (member.user.bot)
                            stats.voice_bot++;
                        else
                            stats.voice_human++;
                    }
                }
                for (const id of Object.keys(object.stats)) {
                    const channel = guild.channels.cache.get(id);
                    if (!channel) {
                        delete object.stats[id];
                        utils.savFile(path, object);
                    }
                    channel.setName(object.stats[id].name.replace(new RegExp('<count>', 'g'), stats[object.stats[id].type]), 'Updating statistics.');
                }
            }
        };
        update();
        setInterval(update, 5 * 60 * 1000);
    }
};