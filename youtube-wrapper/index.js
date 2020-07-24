/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   index.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/06/16 01:16:37 by ahallain          #+#    #+#             */
/*   Updated: 2020/06/25 15:38:44 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const YoutubeUrls = [
	'www.youtube.com',
	'youtu.be'
];
const Video = require('./video.js');
const Search = require('./search.js');
const Playlist = require('./playlist.js');

module.exports = {
	Urls: YoutubeUrls,
	Video,
	Search,
	Playlist
};