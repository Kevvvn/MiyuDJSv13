const { MessageEmbed } = require('discord.js');

module.exports = {
	name: 'spoiler',
	description: 'Send an image spoilertagged.',
	args: 'single',
	async run(message, args = '') {
		let image, name;
		if (!message.deletable) return message.reply('I need the `MANAGE_MESSAGES` permission to do that.');
		if (message.attachments.size == 0) {
			return message.reply('Missing image attachment');
		}
		else if (message.attachments.size == 1) {
			await message.channel.sendTyping()
			image = message.attachments.first().url;
			name = message.attachments.first().name;
			if (message.guild.me.permissions.has('MANAGE_WEBHOOKS')) {
				const icon = message.author.avatarURL()
				const hook = await message.channel.createWebhook(message.member.displayName, { avatar: icon, reason: `${message.member.displayName}'s spoiler` }).catch(console.error)
				const contents = {
					files: [{
						attachment: image,
						name: `SPOILER_${name}`,
					}]
				}
				if (args) contents.content = args
				d = await hook.send(contents).catch(err => {
					if (err.message === 'Request entity too large') return message.channel.send(`${message.author}, image is too big!`);
					else console.log(err);
				})
				message.client.datastore.set(d.id, message.author.id)
				return await hook.edit({ name: 'Spoiler!' })
					.then(hook => hook.delete()).then(message.delete())
			}
			else {
				const e = new MessageEmbed();
				e.setAuthor(message.member.displayName, message.author.avatarURL());
				if (args) {
					e.setDescription(args);
				}
				return message.channel.send({
					embeds: [e],
					files: [{
						attachment: image,
						name: `SPOILER_${name}`,
					}],
				}).then(setTimeout(() => message.delete()))
					.catch(err => {
						if (err.message === 'Request entity too large') return message.channel.send(`${message.author}, image is too big!`);
						else console.log(err);
					});
			}
		}

		else {
			await message.channel.send(`${message.author}, send only one image at a time`);
			return setTimeout(() => message.delete(), 250);
		}
	},
};