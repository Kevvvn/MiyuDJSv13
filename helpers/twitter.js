const Twitter = require('twitter');
const { api, secret, token } = require('../tokens.json').twitter;

const regex = /(http(s)?:\/\/)?(www\.)?twitter\.com\/([a-zA-Z0-9_]+)?(\/web)?\/status\/([0-9]*)/i;
const twitter = new Twitter({
	consumer_key: api,
	consumer_secret: secret,
	bearer_token: token,
});
async function getCount(url) {
	const res = url.match(regex);
	const id = res[6];
	let tweet;
	try {
		tweet = await getTweet(id);
	}
	catch {
		return 0;
	}
	if (tweet.extended_entities == undefined) return 0;
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
module.exports.emotes = {
	1: '1️⃣',
	2: '2️⃣',
	3: '3️⃣',
	4: '4️⃣',
	5: '⏯️',
};
// 1️⃣2️⃣3️⃣4️⃣
module.exports.getTweet = getTweet;
module.exports.getCount = getCount;
module.exports.re = regex