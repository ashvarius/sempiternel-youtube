/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chose.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 17:32:55 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/27 10:19:02 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const MessageEmbed = require('discord.js').MessageEmbed;
const utils = require('../../utils.js');

module.exports = {
    name: 'chose',
    aliases: [],
    description: 'Choose between a few arguments.',
    privateMessage: true,
    message: message => {
        if (!message.args.length) {
            utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                '<format>': `${message.prefix}8ball <question...>`
            });
            return;
        }
        const users = Array.from(message.mentions.users.values());
        if (users.length < 2) {
            utils.sendMessage(message.channel, message.dictionary, 'error_chose_less');
            return;
        }
        utils.sendEmbed(message.channel, message.dictionary, new MessageEmbed().setDescription(users[Math.floor(Math.random() * users.length)]));
    }
};