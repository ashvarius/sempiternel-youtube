module.exports = {
	name: 'clear',
	description: 'description_clear',
	permissions: ['MANAGE_MESSAGES'],
	options: [
		{
			type: 4,
			name: 'amount',
			description: 'description_clear',
			required: true
		}
	],
	command: async object => {
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
	checkPermission: object => {
		if (!object.member.hasPermission('MANAGE_MESSAGES'))
			return false;
		return true;
	}
};