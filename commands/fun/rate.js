/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   rate.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 17:32:55 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/27 12:10:10 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const MessageEmbed = require('discord.js').MessageEmbed;
const utils = require('../../utils.js');

module.exports = {
    name: 'rate',
    aliases: [],
    description: 'Rate a question.',
    message: message => {
        if (!message.args.length) {
            utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                '<format>': `${message.prefix}note <question...>`
            });
            return;
        }
        let question = '';
        for (const word of message.args) {
            if (question.length)
                question += ' ';
            question += word;
        }
        console.log(utils.getUserScore(message.author));
        const score = utils.getUserScore(message.author) % 100 + utils.getStringScore(question);
        utils.sendEmbed(message.channel, message.dictionary, new MessageEmbed().setDescription(`${score % 10}/10`));
    }
};