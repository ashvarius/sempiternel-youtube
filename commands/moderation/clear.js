module.exports = {
	name: 'clear',
	description: 'description_clear',
	options: [
		{
			type: 4,
			name: 'integer',
			description: 'description_clear',
			required: true
		}
	],
	command: async object => {
		if (!object.guild.me.hasPermission('MANAGE_MESSAGES'))
			return object.client.utils.getMessage(object.channel, 'error_bot_no_permission', {
				permission: 'MANAGE_MESSAGES'
			});
		let number = object.options[0].value;
		let deleted = 0;
		while (number) {
			const amount = await object.channel.bulkDelete(number > 100 ? 100 : number, true)
				.then(messages => Array.from(messages.keys()).length)
				.catch(() => { });
			if (!amount)
				break;
			deleted += amount;
			number -= amount;
		}
		return object.client.utils.getMessage(object.channel, 'clear_success', { amount: deleted });
	},
	permission: object => {
		if (!object.member.hasPermission('MANAGE_MESSAGES'))
			return false;
		return true;
	}
};