/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   roulette.js                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 18:45:35 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/27 09:27:30 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');
const MessageEmbed = require('discord.js').MessageEmbed;

module.exports = {
    name: 'roulette',
    aliases: [],
    description: 'Find out who matches the message entered.',
    message: message => {
        if (!message.args.length) {
            utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                '<format>': `${message.prefix}roulette <message...>`
            });
            return;
        }
        let inputMessage = '';
        for (const word of message.args) {
            if (inputMessage.length)
                inputMessage += ' ';
            inputMessage += word;
        }
        const members = Array.from(message.guild.members.cache.keys());
        const score = utils.getUserScore(message.author) % members.length + utils.getStringScore(inputMessage);
        utils.sendEmbed(message.channel, message.dictionary, new MessageEmbed().setDescription(message.guild.members.cache.get(members[score % members.length])));
    }
};