const { URL } = require('url');

module.exports = {
	name: 'embed',
	private: true,
	description: 'description_embed',
	options: [
		{
			type: 3,
			name: 'description',
			description: 'description_embed',
			required: true
		},
		{
			type: 3,
			name: 'title',
			description: 'description_embed',
		},
		{
			type: 3,
			name: 'image',
			description: 'description_embed',
		},
		{
			type: 3,
			name: 'footer',
			description: 'description_embed',
		}
	],
	command: object => {
		const embed = object.client.utils.createEmbed(object.options[0].value);
		if (object.options[1])
			embed.setTitle(object.options[1].value);
		if (object.options[2])
			try {
				new URL(object.options[2].value);
				embed.setImage(object.options[2].value);
				// eslint-disable-next-line no-empty
			} catch { }
		if (object.options[3])
			embed.setFooter(object.options[3].value);
		return embed;
	}
};