module.exports = {
    name: 'reaction',
    aliases: [],
    command: async command => {
        if (!command.args.length || !['add', 'reset'].includes(command.args[0].toLowerCase())) {
            const embed = command.message.client.utils.createEmbed();
            embed.addField(`${command.prefix}${command.command} add <role...> [messageId]`, command.message.client.utils.getMessage(command.message.channel, 'reaction_help_add'));
            embed.addField(`${command.prefix}${command.command} reset`, command.message.client.utils.getMessage(command.message.channel, 'reaction_help_reset'));
            command.message.client.utils.sendEmbed(command.message.channel, embed);
            return;
        }
        if (command.args[0].toLowerCase() == 'add') {
            if (!Array.from(command.message.mentions.roles.values()).length) {
                const embed = command.message.client.utils.createEmbed();
                embed.addField(`${command.prefix}${command.command} add <role...> [messageId]`, `${command.message.client.utils.getMessage(command.message.channel, 'reaction_help_add')}\n${command.message.client.utils.getMessage(command.message.channel, 'help_id')}`);
                command.message.client.utils.sendEmbed(command.message.channel, embed);
                return;
            }
            const data = [];
            let message;
            for (const role of command.message.mentions.roles.values()) {
                let emoji;
                while (!emoji) {
                    if (!message)
                        message = await command.message.client.utils.sendMessage(command.message.channel, 'reaction_await_reaction', { role });
                    else
                        await command.message.client.utils.replaceMessage(message, 'reaction_await_reaction', { role });
                    const reaction = Array.from((await message.awaitReactions((reaction, user) => {
                        if (command.message.channel.permissionsFor(command.message.guild.me).has('MANAGE_MESSAGES'))
                            reaction.users.remove(user);
                        if (user.id != command.message.author)
                            return false;
                        return true;
                    }, { time: 60000, max: 1 })).values())[0];
                    if (!reaction) {
                        message.delete();
                        return;
                    }
                    emoji = await message.react(reaction.emoji)
                        .then(reaction => reaction.emoji)
                        .catch(() => { });
                    if (!emoji && command.message.channel.permissionsFor(command.message.guild.me).has('MANAGE_MESSAGES'))
                        reaction.users.remove(command.message.author);
                }
                data.push({ emoji, role });
            }
            message.delete();
            const list = [];
            for (const reaction of data)
                list.push(`${reaction.emoji} - ${reaction.role}`);
            message = await command.message.channel.messages.fetch(command.args[command.args.length - 1]).catch(() => { });
            if (!message)
                message = await command.message.client.utils.sendEmbed(command.message.channel, command.message.client.utils.createEmbed(`${command.message.client.utils.getMessage(command.message.channel, 'reaction_add')}\n${list.join('\n')}`));
            for (const reaction of data)
                message.react(reaction.emoji);
            const guildData = command.message.client.utils.readFile(`guilds/${command.message.guild.id}.json`);
            if (!guildData.reaction)
                guildData.reaction = {};
            guildData.reaction[message.id] = [];
            for (const reaction of data)
                guildData.reaction[message.id].push({
                    emoji: reaction.emoji.id ? reaction.emoji.id : reaction.emoji.name,
                    role: reaction.role.id
                });
            command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
        } else {
            const guildData = command.message.client.utils.readFile(`guilds/${command.message.guild.id}.json`);
            delete guildData.reaction;
            command.message.client.utils.savFile(`guilds/${command.message.guild.id}.json`, guildData);
            command.message.client.utils.sendMessage(command.message.channel, 'reaction_reset');
        }
    },
    messageReactionAdd: (messageReaction, user) => {
        if (user.bot || messageReaction.message.channel.type == 'dm')
            return;
        const guildData = messageReaction.client.utils.readFile(`guilds/${messageReaction.message.guild.id}.json`);
        if (!(guildData.reaction && guildData.reaction[messageReaction.message.id]))
            return;
        if (messageReaction.message.guild.me.hasPermission('MANAGE_ROLES')) {
            const member = messageReaction.message.guild.members.cache.get(user.id);
            if (member.manageable) {
                let emoji = messageReaction.emoji;
                emoji = emoji.id ? emoji.id : emoji.name;
                for (const reaction of guildData.reaction[messageReaction.message.id])
                    if (reaction.emoji == emoji) {
                        const role = messageReaction.message.guild.roles.cache.get(reaction.role);
                        if (role) {
                            member.roles.add(role);
                            for (const reaction of messageReaction.message.reactions.cache.values())
                                if (reaction != messageReaction)
                                    if (reaction.users.cache.get(user.id))
                                        reaction.users.remove(user);
                            return;
                        }
                        break;
                    }
            }
        }
        if (messageReaction.message.guild.me.hasPermission('MANAGE_EMOJIS'))
            messageReaction.users.remove(user);
    },
    messageReactionRemove: (messageReaction, user) => {
        if (user.bot || messageReaction.message.channel.type == 'dm')
            return;
        if (!messageReaction.message.guild.me.hasPermission('MANAGE_ROLES'))
            return
        const member = messageReaction.message.guild.members.cache.get(user.id);
        if (!member.manageable)
            return;
        const guildData = messageReaction.client.utils.readFile(`guilds/${messageReaction.message.guild.id}.json`);
        if (!(guildData.reaction && guildData.reaction[messageReaction.message.id]))
            return;
        let emoji = messageReaction.emoji;
        emoji = emoji.id ? emoji.id : emoji.name;
        for (const reaction of guildData.reaction[messageReaction.message.id])
            if (reaction.emoji == emoji) {
                const role = messageReaction.message.guild.roles.cache.get(reaction.role);
                member.roles.remove(role);
                return;
            }
    }
}; 