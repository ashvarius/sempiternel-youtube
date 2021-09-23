const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
	name: 'voiceStateUpdate',
	execute(oldState, newState) {
		if (!oldState.channelId) return;
		if (newState.channelId) return;
		const channel = oldState.channel;
		const connection = getVoiceConnection(channel.guildId);
		if (!connection) return;
		if (channel.members.filter(member => !member.user.bot).size) return;
		connection.disconnect();
	},
};
