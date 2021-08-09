const Discord = require('discord.js');
const { PREFIX, TOKEN, OWNER } = require('./tokens.json');
const fs = require('fs-extra');
const _ = require('lodash');
const twitter = require('./helpers/twitter')
const doujin = require('./helpers/doujin')
const re = /.?https?:\/\/(?:www\.)?((e[-x]{1}hentai\.org)|(nhentai\.net)|(hitomi\.la)|(tsumino\.com))\S+/gi;

const client = new Discord.Client({
    makeCache: Discord.Options.cacheWithLimits({
        MessageManager: 1000,
        PresenceManager: 0,
    }),
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Discord.Intents.FLAGS.DIRECT_MESSAGES,
        Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    ],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
    presence: { activities: [{ name: 'Illya sleep', type: 3 }] },
    restRequestTimeout: 60000
})
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./cogs/').filter(f => f.endsWith('.js'));

commandFiles.forEach(cmd => {
    const command = require(`./cogs/${cmd}`);
    client.commands.set(command.name, command);
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.username}-chan`)
    await client.application.fetch()
    console.log(`Serving ${client.application.owner.username}`)
})

client.on('messageCreate', async message => {
    let content = message.content
    if (message.embeds.length) content = `[[${get_embed_title(message.embeds[0])}]] ${content}`
    console.log(`${message.author.username}: ${content}`)
    if (message.author.bot) return
    const match = message.content.match(re);
    if (message.content.startsWith(PREFIX)) handleCommand(message)

    if (message.content.match(/(http(s)?:\/\/)?(www\.)?twitter\.com\/([a-zA-Z0-9_]+)?(\/web)?\/status\/([0-9]*)/i) && message.guild) {
        const count = await twitter.getCount(message.content);
        if (count > 1 && count < 6 && (message.guild.me.permissions.has('ADD_REACTIONS'))) {
            const emote = twitter.emotes[count];
            message.react(emote);
        }
    }

    if (message.content.match(doujin.re)) doujin.process_book(message)
})

client.on('messageReactionAdd', async (reaction, user) => {
    /*
        TODO
        ADD MESSAGE-AUTHOR DB
        SO THAT ONLY AUTHOR CAN DELETE MESSAGE
    */
    if (reaction.partial) await reaction.message.fetch()
    if (user.client.user == user) return
    if (['🗑️', '❌'].includes(reaction.emoji.name) && reaction.message.author.id == client.user.id) {
        reaction.message.delete()
    }
})
function get_embed_title(embed) {
    if (embed.title) return embed.title
    else return embed.url
}
async function handleCommand(message) {
    const command = message.content.trim().split(/\s+/g)[0].replace(PREFIX, '').toLocaleLowerCase();
    let args = message.content.trim().split(/\s+/g).slice(1);
    const cog = client.commands.get(command);
    if (cog) {
        if (cog.args) {
            if (cog.args == 'single') args = args.join(' ');
        }
        if (cog.permission) {
            if (cog.permission.includes('OWNER') && message.author.id !== OWNER) return;
            if (message.author.id === OWNER || message.member.permissions.has(cog.permission, { checkAdmin: true, checkOwner: true })) {
                console.log(message.member.permissions.has(cog.permission))
                cog.run(message, args);
            }
        }
        else { cog.run(message, args); }
    }

}

process.on('unhandledRejection', error => {
    console.error('unhandled api error', error)
})

client.login(TOKEN)