/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   8ball.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/24 17:32:55 by ahallain          #+#    #+#             */
/*   Updated: 2020/04/27 09:46:27 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const utils = require('../../utils.js');

module.exports = {
    name: '8ball',
    aliases: ['answer', 'ball'],
    description: 'Answer a question.',
    message: message => {
        if (!message.args.length) {
            utils.sendMessage(message.channel, message.dictionary, 'error_invalid_format', {
                '<format>': `${message.prefix}8ball <question...>`
            });
            return;
        }
        let question = '';
        for (const word of message.args) {
            if (question.length)
                question += ' ';
            question += word;
        }
        const score = utils.getUserScore(message.author) % 100 + utils.getStringScore(question);
        utils.sendMessage(message.channel, message.dictionary, score % 2 ? 'yes' : 'no');
    }
};