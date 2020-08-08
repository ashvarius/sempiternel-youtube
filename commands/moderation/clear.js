module.exports = {
    name: 'clear',
    aliases: ['clean'],
    command: async command => {
        let number = command.args.length && !isNaN(command.args[0]) ? parseInt(command.args[0]) : null;
        if (!number || number <= 0) {
            const embed = command.message.client.utils.createEmbed();
            embed.addField(`${command.prefix}${command.command} <number>`, command.message.client.utils.getMessage(command.message.channel, 'clear_help'));
            command.message.client.utils.sendEmbed(command.message.channel, embed);
            return;
        }
        let deleted = 0;
        while (number) {
            const amount = Array.from((await command.message.channel.bulkDelete(number > 100 ? 100 : number, true)).keys()).length;
            if (!amount)
                break;
            deleted += amount;
            number -= amount;
        }
        command.message.client.utils.sendMessage(command.message.channel, 'clear_success', { amount: deleted });
    }
};