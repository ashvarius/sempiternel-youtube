/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   broadcast.js                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/23 15:31:57 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/27 10:19:30 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const Client = require('discord.js').Client;
const utils = require('../../utils.js');

module.exports = {
    name: 'broadcast',
    aliases: '',
    description: 'Send a message to as many people as possible with a particular bot',
    privateMessage: true,
    message: async message => {
        if (message.args.length < 2) {
            utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                '<format>': `${message.prefix}broadcast <token> <message...>`
            });
            return;
        }
        const token = message.args[0];
        let broadcastMessage = '';
        for (let index = 1; index < message.args.length; index++) {
            if (broadcastMessage.length)
                broadcastMessage += ' ';
            broadcastMessage += message.args[index];
        }
        const client = new Client({
            fetchAllMembers: true
        });
        client.on('ready', async () => {
            await utils.replaceMessage(sendedMessage, message.dictionary, 'broadcast_sending', {
                '<message>': broadcastMessage
            });
            const guilds = {};
            const members = [];
            for (const guild of client.guilds.cache.values()) {
                let count = 0;
                for (const member of guild.members.cache.values())
                    if (!members.includes(member.id)) {
                        await member.send(broadcastMessage).then(() => count++).catch(() => { });
                        members.push(member.id);
                    }
                if (count)
                    guilds[guild.name] = count;
            }
            let servers = '';
            for (const guild of Object.keys(guilds)) {
                if (servers.length)
                    servers += '\n';
                servers += `${guild} **(${guilds[guild]} members)**`;
            }
            utils.replaceMessage(sendedMessage, message.dictionary, 'broadcast_success', {
                '<servers>': servers,
            });
            client.destroy();
        });
        const sendedMessage = await utils.sendMessage(message.channel, message.dictionary, 'broadcast_login', {
            '<token>': token
        });
        client.login(token).catch(err => utils.sendMessage(message.channel, message.dictionary, 'error_broadcast_cannot_login', {
            '<message>': err.message
        }));
    }
};