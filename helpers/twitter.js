const Twitter = require('twitter');
const { api, secret, token } = require('../tokens.json').twitter;
const { MessageEmbed } = require('discord.js')
const fetch = require('node-fetch')

const regex = /(http(s)?:\/\/)?(www\.)?twitter\.com\/([a-zA-Z0-9_]+)?(\/web)?\/status\/([0-9]*)/i;
const twitter = new Twitter({
	consumer_key: api,
	consumer_secret: secret,
	bearer_token: token,
});
function getId(url) {
	const res = url.match(regex);
	if (res) return res[6];
}
function getCount(tweet) {
	if (tweet?.extended_entities == undefined) return 0;
	if (['video', 'animated_gif'].includes(tweet.extended_entities.media[0].type)) return 5
	return tweet.extended_entities.media.length;
}
async function getTweet(id) {
	return new Promise((resolve, reject) => {
		twitter.get('statuses/show', { id: id, tweet_mode: 'extended' }, (error, tweet) => {
			if (error) { reject(error); }
			else {
				resolve(tweet);
			}
		});
	});
}
async function getMedia(tweet, message) {
	let media
	switch (tweet.extended_entities.media[0].type) {
		case "photo":
			media = tweet.extended_entities.media.map(m => m.media_url);
			media = media.map((img, i) => ({ attachment: img + ':orig', name: `${tweet.id}_${i}.jpg` }));
			break;
		case "animated_gif":
			media = tweet.extended_entities.media[0].video_info.variants[0].url
			media = [{ attachment: media, name: `${tweet.id}.mp4` }]
			break
		case "video":
			media = tweet.extended_entities.media[0].video_info.variants.map(m => m.url)
			const vids = []
			for (url of media) {
				const res = await fetch(url, { method: 'HEAD' })
				vids.push({
					url: url,
					size: res.headers.get('content-length'),
				})
			}
			vids.sort((a, b) => parseInt(b.size) - parseInt(a.size))
			const tier = message.guild.premiumTier
			while (['NONE', 'TIER_1'].includes(tier) && parseInt(vids[0].size) > 8000000) vids.shift()
			media = [{ attachment: vids[0].url, name: `${tweet.id}.mp4` }]
			break;
		default:
			break;
	}
	return media
}
async function process_message(message) {
	const spoilerFilter = message.content.split('||')
		.filter((e, idx) => idx % 2 == 0)
		.join(' ')
	const settings = JSON.parse(message.client.datastore.get(message.guild.id))
	const id = getId(spoilerFilter)
	let tweet
	try { tweet = await getTweet(id) }
	catch { return }
	const count = getCount(tweet)
	if (!count) return
	if (settings.twitter_react) await react(message, count)
	if (settings.twitter_rehost) await rehost(message, tweet)
}
async function react(message, count) {
	if (count > 1 && count < 6 && (message.guild.me.permissions.has('ADD_REACTIONS'))) {
		const emote = emotes[count];
		message.react(emote);
	}
}
async function rehost(message, tweet) {
	await message.channel.sendTyping()
	const media = await getMedia(tweet, message);
	const e = new MessageEmbed()
		.setAuthor(tweet.user.screen_name, tweet.user.profile_image_url)
		.setDescription(tweet.full_text);
	return await message.channel.send({ embeds: [e], files: media }).then(msg => {
		message.client.datastore.set(msg.id, message.author.id);
		message.suppressEmbeds().catch(err => {
			if (err.code != 50013) client.error(err.message);
		});
	});
}
const emotes = {
	1: '1️⃣',
	2: '2️⃣',
	3: '3️⃣',
	4: '4️⃣',
	5: '⏯️',
};
module.exports.emotes = emotes
module.exports.getTweet = getTweet
module.exports.getCount = getCount
module.exports.re = regex
module.exports.process_message = process_message