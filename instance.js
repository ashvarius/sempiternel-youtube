const { Client, Constants } = require('discord.js');
const EventEmitter = require('events');
const fs = require('fs');
const Utils = require('./utils.js');
const default_config = require('./config.json');

class DiscordBot extends EventEmitter {
    constructor(config = {}) {
        super();
        config = Object.assign({
            color: "#000000",
            disable: []
        }, default_config, config);
        const commands = {};
        if (fs.existsSync('commands'))
            for (const folder of fs.readdirSync('commands')) {
                commands[folder] = {};
                for (const file of fs.readdirSync(`commands/${folder}`)) {
                    const command = require(`./commands/${folder}/${file}`);
                    commands[folder][command.name] = command;
                }
            }
        const dispatcher = (event, var1, var2) => {
            for (const category of Object.keys(commands))
                for (const command of Object.values(commands[category]))
                    if (typeof command[event] == 'function')
                        command[event](var1, var2);
        };
        const client = this.client = new Client({
            shards: 'auto',
            fetchAllMembers: true,
            presence: {
                status: 'idle'
            }
        });
        client.config = config;
        client.commands = commands;
        client.on('ready', () => {
            console.log(`${client.user.username} is ready`);
            this.emit('ready');
        });
        client.on('message', message => {
            dispatcher('message', message);
            let [command, ...args] = message.content.split(' ').filter(item => item.length);
            if (!command)
                return;
            let prefix;
            if (message.channel.type != 'dm') {
                prefix = message.guild.prefix;
                if (!prefix)
                    prefix = config.prefix;
                if (command.includes(prefix))
                    command = command.slice(prefix.length);
                else
                    return;
            } else
                prefix = '';
            const cmd = command.toLowerCase();
            for (const category of Object.keys(commands))
                for (const instance of Object.values(commands[category])) {
                    if (!client.config.disable.includes(instance.name))
                        if (instance.name == cmd || instance.aliases.includes(cmd)) {
                            instance.command({
                                command,
                                args,
                                prefix,
                                message
                            });
                            return;
                        }
                }
            client.utils.sendMessage(message.channel, 'error_no_command', { command });
        });
        client.on('exit', (code = 0) => {
            if (this.exit) {
                this.emit('exit', code);
                return;
            }
            this.destroy();
            if (code)
                this.login();
        });
        const register = Object.keys(client._events);
        for (const event of Object.values(Constants.Events))
            if (!register.includes(event))
                client.on(event, (var1, var2) => {
                    dispatcher(event, var1, var2);
                });
    }
    login(token) {
        if (token)
            this.token = token;
        if (this.client.ws.destroyed) {
            this.client.ws.destroyed = false;
            this.client.ws.status = Constants.Status.IDLE;
        }
        return new Promise((executor, reject) => {
            this.client.login(this.client.config.token).then(token => {
                this.client.utils = new Utils(this.client);
                Object.assign(this.client.config, this.client.utils.readFile('config.json'));
                if (!this.client.config.presence)
                    this.client.config.presence = {
                        activity: {
                            name: "his program",
                            type: "LISTENING"
                        }
                    };
                this.client.user.setPresence(this.client.config.presence);
                executor(token);
            }).catch(error => reject(error));
        });
    }
    destroy() {
        this.client.destroy();
        if (this.client.user)
            console.log(`${this.client.user.username} is destroy`);
    }
};

module.exports = DiscordBot;