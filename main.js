/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.js                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ahallain <ahallain@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2020/04/20 11:09:34 by ahallain          #+#    #+#             */
/*   Updated: 2020/07/05 18:33:14 by ahallain         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const Instance = require('./instance.js');

const instances = {};

process.on('uncaughtException', err => console.error(err));

process.on('SIGINT', () => {
	instances.main.client.emit('exit');
});

instances.main = new Instance(require('./main_config.json'));
instances.main._instances = instances;