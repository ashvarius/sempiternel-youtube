/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   nasa.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/05/08 10:03:49 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/10 18:27:52 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const MessageEmbed = require('discord.js').MessageEmbed;
const utils = require('../../utils.js');
const stream = require('../../stream.js');

const nasa = {};

module.exports = {
	name: 'nasa',
	aliases: [],
	description: 'Get the astronomical picture of the day.',
	privateMessage: true,
	message: async (message, object) => {
		const date = new Date();
		date.setTime(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
		const day = date.getDay();
		if (day != nasa.day) {
			nasa.object = JSON.parse(await stream.promise(`https://api.nasa.gov/planetary/apod?hd=true&api_key=${message.client._config.nasa}`));
			nasa.day = day;
		}
		let embed = new MessageEmbed();
		embed.setTitle(nasa.object.title);
		embed.setURL(nasa.object.url);
		embed.setDescription(nasa.object.explanation);
		if (nasa.object.copyright)
			embed.addField('Copyright', nasa.object.copyright);
		if (nasa.object.media_type == 'image')
			embed.setImage(nasa.object.url);
		else
			embed.setDescription(`${embed.description}\n\n[[${nasa.object.media_type}]](${nasa.object.url})`);
		utils.sendEmbed(message.channel, object.dictionary, embed);
	}
};