/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   love.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 17:32:55 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/27 15:46:59 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const MessageEmbed = require('discord.js').MessageEmbed;
const utils = require('../../utils.js');

module.exports = {
    name: 'love',
    aliases: [],
    description: 'Answer a question.',
    privateMessage: true,
    message: message => {
        if (!message.args.length) {
            utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                '<format>': `${message.prefix}love <option>`
            });
            return;
        }
        const option = message.args[0].toLowerCase();
        if (option == 'calc') {
            const users = Array.from(message.mentions.users.values());
            if (users.length != 2) {
                utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                    '<format>': `${message.prefix}love <user> <user>`
                });
                return;
            }
            utils.sendMessage(message.channel, message.dictionary, 'love_calc', {
                '<user1>': users[0],
                '<user2>': users[1],
                '<percent>': (utils.getUserScore(users[0]) + utils.getUserScore(users[1])) % 101
            });
        } else if (option == 'top') {
            const scores = {};
            for (const id of message.guild.members.cache.keys())
                for (const id1 of message.guild.members.cache.keys())
                    if (id != id1)
                        if (!(scores[`${id} ${id1}`] || scores[`${id1} ${id}`]))
                            scores[`${id} ${id1}`] = (utils.getUserScore(message.guild.members.cache.get(id)) + utils.getUserScore(message.guild.members.cache.get(id1))) % 101
            const topScores = {};
            for (const key of Object.keys(scores))
                if (scores[key] == 100)
                    topScores[key] = scores[key];
            delete scores;
            let messages = [utils.getMessage(message.dictionary, 'love_top')];
            for (const key of Object.keys(topScores)) {
                const ids = key.split(' ');
                const user1 = message.guild.members.cache.get(ids[0]);
                const user2 = message.guild.members.cache.get(ids[1]);
                messages.push(`${user1} ${user2} - ${topScores[key]}/100`);
            }
            messages = utils.remakeList(messages);
            for (const pendingMessage of messages)
                utils.sendEmbed(message.channel, message.dictionary, new MessageEmbed().setDescription(pendingMessage));
        } else {
            let options = '';
            for (const option of ['calc', 'top']) {
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
    }
};