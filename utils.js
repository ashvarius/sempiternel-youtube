const fs = require('fs');
const prism = require('prism-media');
const { MessageEmbed } = require('discord.js');
const Cache = require('./cache.js');

const loadedFiles = new Cache();
const dictionaries = {};

if (fs.existsSync('dictionaries'))
	for (const folder of fs.readdirSync('dictionaries')) {
		dictionaries[folder] = {};
		for (const file of fs.readdirSync(`dictionaries/${folder}`)) {
			const dictionary = require(`./dictionaries/${folder}/${file}`);
			Object.assign(dictionaries[folder], dictionary);
		}
	}

class Utils {
	constructor(client, firestore) {
		this.client = client;
		this.firestore = firestore;
		this.docRef = firestore.collection('bot').doc(client.user.id);
		if (this.client.main)
			if (fs.existsSync('data')) {
				for (const bot_id of fs.readdirSync('data'))
					if (bot_id != 'bots.json') {
						let config = {};
						if (fs.existsSync(`data/${bot_id}/config.json`)) {
							config = JSON.parse(fs.readFileSync(`data/${bot_id}/config.json`));
							fs.unlinkSync(`data/${bot_id}/config.json`);
						}
						if (bot_id == this.client.user.id
							&& fs.existsSync('data/bots.json')) {
							config.bot = JSON.parse(fs.readFileSync('data/bots.json'));
							fs.unlinkSync('data/bots.json');
						}
						const docRef = this.firestore.collection('bot').doc(bot_id);
						docRef.set(config);
						if (fs.existsSync(`data/${bot_id}/users`)) {
							for (const file of fs.readdirSync(`data/${bot_id}/users`)) {
								docRef.collection('user').doc(file.split('.')[0]).set(JSON.parse(fs.readFileSync(`data/${bot_id}/users/${file}`)));
								fs.unlinkSync(`data/${bot_id}/users/${file}`);
							}
							fs.rmdirSync(`data/${bot_id}/users`);
						}
						if (fs.existsSync(`data/${bot_id}/guilds`)) {
							for (const file of fs.readdirSync(`data/${bot_id}/guilds`)) {
								docRef.collection('guild').doc(file.split('.')[0]).set(JSON.parse(fs.readFileSync(`data/${bot_id}/guilds/${file}`)));
								fs.unlinkSync(`data/${bot_id}/guilds/${file}`);
							}
							fs.rmdirSync(`data/${bot_id}/guilds`);
						}
						fs.rmdirSync(`data/${bot_id}`);
					}
				fs.rmdirSync('data');
			}
	}
	async savFile(docRef, object) {
		if (!object)
			throw 'object undefined';
		if (Object.is(loadedFiles.get(docRef.path), object))
			return object;
		await docRef.set(object);
		loadedFiles.set(docRef.path, object);
		return object;
	}
	async readFile(docRef) {
		let object = null;
		if (loadedFiles.get(docRef.path))
			object = loadedFiles.get(docRef.path);
		else {
			const doc = await docRef.get();
			if (doc.exists) {
				object = doc.data();
				loadedFiles.set(docRef.path, object);
			}
		}
		if (object == null)
			return {};
		return JSON.parse(JSON.stringify(object));
	}
	deleteFile(docRef) {
		return docRef.delete();
	}
	createEmbed(description) {
		const embed = new MessageEmbed();
		if (description)
			embed.setDescription(description);
		embed.setColor(this.client.config.color);
		return embed;
	}
	getDictionary(language) {
		let dictionary = dictionaries[language];
		if (!dictionary)
			dictionary = dictionaries[this.client.config.language];
		return dictionary;
	}
	getMessage(language, key, object = {}) {
		const dictionary = this.getDictionary(language);
		let message = dictionary[key];
		if (!message) {
			message = dictionary.error_no_message;
			object = { key };
		}
		for (const key of Object.keys(object))
			message = `${message}`.replace(new RegExp(`<${key}>`, 'g'), object[key]);
		if (message.length > 2048)
			return (this.getMessage(language, 'error_too_large_message'));
		return message;
	}
	async sendEmbed(channel, embed) {
		if (channel.type != 'dm' && !channel.permissionsFor(channel.guild.me).has('EMBED_LINKS')) {
			channel.send(channel.client.utils.getMessage(channel, 'error_bot_no_permission', { permission: 'EMBED_LINKS' }));
			return;
		}
		if (embed.author && embed.author.iconURL && !embed.author.url)
			embed.author.url = embed.author.iconURL;
		return await channel.send(embed);
	}
	sendMessage(channel, key, object) {
		return this.sendEmbed(channel, this.createEmbed(this.getMessage(channel, key, object)));
	}
	replaceEmbed(message, embed) {
		if (message.channel.type != 'dm' && !message.channel.permissionsFor(message.guild.me).has('EMBED_LINKS')) {
			message.edit(message.client.utils.getMessage(message.channel, 'error_bot_no_permission', { permission: 'EMBED_LINKS' }));
			return;
		}
		if (embed.author && embed.author.iconURL && !embed.author.url)
			embed.author.url = embed.author.iconURL;
		return message.edit(embed);
	}
	replaceMessage(message, key, object) {
		return this.replaceEmbed(message, this.createEmbed(this.getMessage(message.channel, key, object)));
	}
	generateTranscoder(url, { start = 0, args } = {}) {
		let options = [
			'-reconnect', '1',
			'-reconnect_streamed', '1',
			'-reconnect_delay_max', '5',
			'-ss', start,
			'-i', url,
			'-analyzeduration', '0',
			'-loglevel', '0',
			'-f', 's16le',
			'-ar', '48000',
			'-ac', '2'
		];
		if (args)
			options = options.concat(args);
		return new prism.FFmpeg({ args: options });
	}
	playTranscoder(player, trancoder) {
		const opus = trancoder.pipe(new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 48 * 20 }));
		const dispatcher = player.createDispatcher({
			type: 'opus',
			bitrate: 48
		}, { opus });
		opus.pipe(dispatcher);
		return dispatcher;
	}
	createCache(limit) {
		return new Cache(limit);
	}
}

module.exports = Utils;