const fetch = require('node-fetch');
const nh = require('./nhentai');
const decodeEntities = require('decode-entities');


async function process_url(url) {
    const id = url.match(/\bhttps?:\/\/e[-x]{1}hentai\.org\/([gs])\/(\S+)/i)
    if (!id) return
    let bookKeys, gid, pid, page, token
    switch (id[1]) {
        case 'g':
            [gid, token] = id[2].split('/')
            bookKeys = [gid, token]
            break
        case 's':
            [gid, pid, page] = id[2].split(/[/-]/i)
            const tokens = await requestGalleryToken([[pid, gid, page]])
            if (!tokens.tokenlist[0].error) {
                bookKeys = [tokens.tokenlist[0].gid, tokens.tokenlist[0].token]
            }
            break
    }
    return bookKeys
}
async function fetchBooks(gidlist) {
    let galleryData = await requestGallery(gidlist)
    if (galleryData.error) return console.error(galleryData.error)
    galleryData = galleryData.gmetadata

    const books = []

    for (const g of galleryData) {
        if (g.error) {
            return console.error(g.error)
        }

        let title = decodeEntities(g.title)
        if (title.length > 255) title = title.substring(0, 252) + '...'
        const tags = sortTags(g.tags)
        let posted = new Date(parseInt(g.posted + '000'))
        posted = posted.toUTCString()

        const nhentai = await nh.getMirror(g.title)
        const book = {
            id: g.gid,
            title: title,
            cover: g.thumb,
            url: `https://exhentai.org/g/${g.gid}/${g.token}/`,
            category: g.category,
            tags: tags,
            pages: g.filecount,
            uploaded: posted,
            footer: `exhentai | ${g.category} | ${g.filecount} images`,
            color: '5c0d11',
            token: g.token,
            nhentai: nhentai,
        }
        book.JSON = JSON.stringify(book, null, 4)
        books.push(book)
    }
    return books
}


async function requestGallery(gidlist) {
    const post_data = {
        'method': 'gdata',
        'gidlist': gidlist,
        'namespace': 1,
    }
    const headers = { 'Content-type': 'application/json', 'Accept': 'text/plain' }

    return fetch('https://api.e-hentai.org/api.php', { method: 'POST', headers: headers, body: JSON.stringify(post_data) })
        .then((res) => {
            return res.json()
        })
}
async function requestGalleryToken(gidlist){
    const post_data = {
        'method': 'gtoken',
        'pagelist': gidlist,
    }
    const headers = { 'Content-type': 'application/json', 'Accept': 'text/plain' }

    return fetch('https://api.e-hentai.org/api.php', { method: 'POST', headers: headers, body: JSON.stringify(post_data) })
        .then((res) => {
            return res.json();
        })
};

function sortTags(tags) {
    const stags = {
        'language': [],
        'character': [],
        'parody': [],
        'female': [],
        'male': [],
        'group': [],
        'artist': [],
        'reclass': [],
        'misc': [],
    }
    tags.forEach(t => {
        if (t.startsWith('artist:')) stags.artist.push(t.slice(7))
        else if (t.startsWith('character:')) stags.character.push(t.slice(10))
        else if (t.startsWith('female:')) stags.female.push(t.slice(7))
        else if (t.startsWith('group:')) stags.group.push(t.slice(6))
        else if (t.startsWith('language:')) stags.language.push(t.slice(9))
        else if (t.startsWith('male:')) stags.male.push(t.slice(5))
        else if (t.startsWith('parody:')) stags.parody.push(t.slice(7))
        else if (t.startsWith('reclass:')) stags.reclass.push(t.slice(8))
        else stags.misc.push(t)
    })
    return stags
}
exports.process_url = process_url
exports.fetchBooks = fetchBooks
exports.requestGallery = requestGallery
exports.requestGalleryToken = requestGalleryToken