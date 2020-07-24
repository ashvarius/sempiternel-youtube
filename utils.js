const fs = require('fs');
const prism = require('prism-media');
const { MessageEmbed } = require('discord.js');

const loadedFiles = {};
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
    constructor(client) {
        this.client = client;
        this.path = `data/${this.client.user.id}`;
    }
    savFile(path, object) {
        if (!object)
            throw "object undefined";
        if (loadedFiles[path] == object)
            return object;
        path = `${this.path}/${path}`;
        if (!fs.existsSync(path))
            fs.mkdirSync(path.slice(0, path.lastIndexOf('/')), {
                recursive: true
            });
        fs.writeFileSync(path, JSON.stringify(object));
        loadedFiles[path] = object;
        return object;
    }
    readFile(path) {
        path = `${this.path}/${path}`;
        if (loadedFiles[path])
            return JSON.parse(JSON.stringify(loadedFiles[path]));
        if (fs.existsSync(path)) {
            const parsed = JSON.parse(fs.readFileSync(path));
            loadedFiles[path] = parsed;
            return JSON.parse(JSON.stringify(parsed));
        }
        return {};
    }
    deleteFile(path) {
        path = `${this.path}/${path}`;
        if (!fs.statSync(path).isDirectory()) {
            fs.unlinkSync(path);
            return;
        }
        for (const filename of fs.readdirSync(path))
            this.deleteFile(`${path}/${filename}`);
        fs.rmdirSync(path);
    }
    createEmbed(description) {
        const embed = new MessageEmbed();
        if (description)
            embed.setDescription(description);
        embed.setColor(this.client.config.color);
        return embed;
    }
    getDictionary(object) {
        let dictionary = object.dictionary;
        if (!dictionary) {
            let language = object.language;
            if (!language)
                language = this.client.config.language;
            dictionary = dictionaries[language];
            object.dictionary = dictionary;
        }
        Object.assign(dictionary, dictionaries.errors);
        return dictionary;
    }
    getMessage(channel, key, object = {}) {
        let dictionary;
        if (channel.type == 'dm')
            dictionary = this.getDictionary(channel.recipient);
        else
            dictionary = this.getDictionary(channel.guild);
        let message = dictionary[key];
        if (!message) {
            message = dictionary.error_no_message;
            object = { key };
        }
        for (const key of Object.keys(object))
            message = `${message}`.replace(new RegExp(`<${key}>`, 'g'), object[key]);
        return message;
    }
    sendEmbed(channel, embed) {
        if (embed.author && embed.author.iconURL && !embed.author.url)
            embed.author.url = embed.author.iconURL;
        return channel.send(embed);
    }
    sendMessage(channel, key, object) {
        const message = this.getMessage(channel, key, object);
        const embed = this.createEmbed(message);
        return this.sendEmbed(channel, embed);
    }
    generateTranscoder = (url, { start = 0, duration = -1 } = {}) => {
        let args = [
            '-reconnect', '1',
            '-reconnect_at_eof', '1',
            '-reconnect_streamed', '1',
            '-ss', start
        ];
        if (duration != -1)
            args = args.concat(['-to', duration]);
        args = args.concat([
            '-i', url,
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2',
            '-c:v', 'libx264',
            '-preset', 'veryslow',
            '-crf', '0',
            '-movflags', '+faststart'
        ]);
        return new prism.FFmpeg({ args });
    }
    playeTranscoder = (player, trancoder) => {
        const opus = trancoder.pipe(new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 48 * 20 }));
        const dispatcher = player.createDispatcher({
            type: 'opus',
            fec: true,
            bitrate: 48,
            highWaterMark: 16
        }, { opus });
        opus.pipe(dispatcher);
    }
}

module.exports = Utils;