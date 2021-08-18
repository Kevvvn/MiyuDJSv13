const re_url = /\bhttps?:\/\/\S+/gi
const re_base_url = /(?<=https?:\/\/)[^#?/]+/gi
const re_www = /(?<=www\.).+/gi
const re_doujin = /.?https?:\/\/(?:www\.)?((e[-x]{1}hentai\.org)|(nhentai\.net)|(hitomi\.la)|(tsumino\.com))\S+/gi
const nhentai = require('./nhentai')
const exhentai = require('./exhentai')
const { MessageEmbed } = require('discord.js')

function map_urls(urls) {
    return urls.map(url => {
        const base = url.match(/(?<=https?:\/\/)[^#?/]+/gi)
        const strip = (base[0].match(/(?<=www\.).+/gi))
        const strippped = strip ? strip[0] : base[0]
        return [url, strippped];
    });
}

async function process_book(message) {
    const nsfw = (!message.guild || message.channel.nsfw)
    const spoilerFilter = message.content.split('||')
        .filter((e, idx) => idx % 2 == 0)
        .join(' ')
    const matches = spoilerFilter.match(re_doujin)
    const mapped = map_urls(matches)
    const extokens = []
    let books = []
    let success = false
    for (url of mapped) {
        switch (url[1].toLowerCase()) {
            case 'exhentai.org':
            case 'e-hentai.org':
                const keys = await exhentai.process_url(url[0])
                if (keys) extokens.push(keys)
                break
            case 'nhentai.net':
                const book = await nhentai.process_book(url[0])
                if (book) books.push(book)
                break
            case 'tsumino.com':
                break
            case 'hitomi.la':
                break
        }
    }
    if (extokens.length) {
        const exbooks = await exhentai.fetchBooks(extokens)
        books = books.concat(exbooks)
    }
    if (!books.length) return
    for (book of books) {
        try {
            d = await message.channel.send({ embeds: [buildEmbed(book, nsfw)] })
            success = true
            message.client.datastore.set(d.id, message.author.id)
        } catch {
            continue
        }
    }
    if (success && message.deletable) return await message.suppressEmbeds(true)
}

function buildDescription(tags) {
    let tagsDescription = '';
    for (const c in tags) {
        if (tags[c].length) {
            tagsDescription = `${tagsDescription} \n**${c}** : ${tags[c].join(', ')}`;
        }
    }
    return tagsDescription;
}

function buildEmbed(book, nsfw = true) {
    const embed = new MessageEmbed()
    if (book.title) embed.setTitle(book.title)
    if (book.tags) embed.setDescription(buildDescription(book.tags))
    if (book.cover) embed.setImage(book.cover)
    if (book.url) embed.setURL(book.url)
    if (book.color) embed.setColor(book.color)
    if (book.footer) embed.setFooter(book.footer)
    if (book.uploaded) embed.setTimestamp(book.uploaded)
    if (book.nhentai) embed.addField('nhentai mirror', book.nhentai)
    if (!nsfw) embed.setImage('https://cdn.discordapp.com/attachments/478415049094856715/666768753450811392/unknown.png')
    return embed;
}

exports.process_book = process_book
exports.re = re_doujin