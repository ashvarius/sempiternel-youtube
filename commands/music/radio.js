const radios = {
    NRJ: 'http://cdn.nrjaudio.fm/audio1/fr/30001/aac_64.mp3',
    FunRadio: 'http://streaming.radio.funradio.fr/fun-1-44-96',
    EVASION: 'https://evasion75.ice.infomaniak.ch/evasion75-96.aac',
    Nostalgie: 'http://cdn.nrjaudio.fm/audio1/fr/30601/aac_64.mp3'
};

const cache = {};

module.exports = {
    name: 'radio',
    aliases: [],
    command: async command => {
        if (command.message.channel.type == 'dm') {
            command.message.client.utils.sendMessage(command.message.channel, 'error_no_dm');
            return;
        }
        if (!command.message.member.hasPermission('ADMINISTRATOR')) {
            command.message.client.utils.sendMessage(command.message.channel, 'error_no_permission', {
                permission: 'ADMINISTRATOR'
            });
            return;
        }
        if (!command.args.length) {
            const embed = command.message.client.utils.createEmbed();
            let list = '';
            for (const name of Object.keys(radios)) {
                if (list.length)
                    list += ', ';
                list += `\`${name}\``;
            }
            embed.addField(`${command.prefix}${command.command} <name>`, `${command.message.client.utils.getMessage(command.message.channel, 'radio_help')}\nName: ${list}`);
            command.message.client.utils.sendEmbed(command.message.channel, embed);
            return;
        }
        if (!command.message.member.voice.channelID) {
            command.message.client.utils.sendMessage(command.message.channel, 'error_no_voice');
            return;
        }
        if (command.message.guild.me.voice.channelID != command.message.member.voice.channelID) {
            if (!command.message.member.voice.channel.joinable) {
                command.message.client.utils.sendMessage(command.message.channel, 'error_not_joinable');
                return;
            }
            await command.message.member.voice.channel.join();
        }
        let radio = command.args[0].toLowerCase();
        radio = Object.keys(radios).find(name => name.toLowerCase() == radio);
        if (!cache[radio]) {
            const broadcast = command.message.client.voice.createBroadcast();
            const transcoder = command.message.client.utils.generateTranscoder(radios[radio]);
            command.message.client.utils.playeTranscoder(broadcast.player, transcoder);
            cache[radio] = broadcast;
        }
        command.message.guild.me.voice.connection.play(cache[radio]);
        command.message.client.utils.sendMessage(command.message.channel, 'radio_success', {
            radio,
            channel: command.message.guild.me.voice.channel
        });
    }
};