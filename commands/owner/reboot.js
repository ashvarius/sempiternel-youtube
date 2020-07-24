module.exports = {
    name: 'restart',
    aliases: ['reboot', 'rb', 'reload', 'rl'],
    command: async command => {
        if (!command.message.client.config.owners.includes(command.message.author.id)) {
            command.message.client.utils.sendMessage(command.message.channel, 'error_not_owner');
            return;
        }
        await command.message.client.utils.sendMessage(command.message.channel, 'reboot_success');
        command.message.client.emit('exit', 1);
    }
};