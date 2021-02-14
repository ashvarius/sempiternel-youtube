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
		if (fs.existsSync('data') && fs.existsSync(`data/${client.user.id}`))
		for (const folder of fs.readdirSync(`data/${client.user.id}`)) {
			for (const file of fs.readdirSync(`data/${client.user.id}/${folder}`))
			{
				const path = `data/${client.user.id}/${folder}/${file}`;
				this.savFile(`${folder}/${file}`, JSON.parse(fs.readFileSync(path)))
					.then(() => fs.unlinkSync(path));
			}
			fs.rmdirSync(`data/${client.user.id}/${folder}`);
		}
	}
	async savFile(path, object) {
		if (!object)
			throw 'object undefined';
		if (loadedFiles.get(path) == object)
			return object;
		let docRef = this.firestore;
		for (const item of path.split('/'))
			docRef = docRef.collection(item).doc(this.client.user.id);
		await docRef.set(object);
		loadedFiles.set(path, object);
		return object;
	}
	async readFile(path) {
		if (loadedFiles.get(path))
			return loadedFiles.get(path);
		let docRef = this.firestore;
		for (const item of path.split('/'))
			docRef = docRef.collection(item).doc(this.client.user.id);
		const doc = await docRef.get();
		if (doc.exists)
			return doc.data();
		return {};
	}
	deleteFile(path) {
		let docRef = this.firestore;
		for (const item of path.split('/'))
			docRef = docRef.collection(item).doc(this.client.user.id);
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
			channel.edit(message.channel.client.utils.getMessage(message.channel, 'error_bot_no_permission', { permission: 'EMBED_LINKS' }));
			return;
		}
		if (embed.author && embed.author.iconURL && !embed.author.url)
			embed.author.url = embed.author.iconURL;
		return message.edit(embed);
	}
	replaceMessage(message, key, object) {
		return this.replaceEmbed(this.createEmbed(this.getMessage(message.channel, key, object)), embed);
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
	playeTranscoder(player, trancoder) {
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