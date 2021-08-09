const { API } = require('nhentai-api');
const nh = new API();
const lev = require('js-levenshtein');

async function nHentaiBook(ID) {
    let book;
    try {
        book = await nh.getBook(ID);
    }
    catch {
        return;
    }
    const tags = {};
    let category;
    book.tags.forEach(tag => {
        if (tag.type.type == 'category') {
            category = tag.name;
        }
        else {
            if (!tags[tag.type.type]) tags[tag.type.type] = [];
            tags[tag.type.type].push(tag.name);
        }
    });
    const NHBook = {};
    NHBook.id = book.id;
    NHBook.title = book.title.pretty;
    NHBook.cover = nh.getImageURL(book.cover);
    NHBook.url = `https://nhentai.net/g/${book.id}/`;
    NHBook.category = category;
    NHBook.tags = tags;
    NHBook.pages = book.pages.length;
    NHBook.uploaded = book.uploaded;
    NHBook.footer = `nhentai | ${category} | ${book.pages.length} images`
    NHBook.color = '8f243c'
    NHBook.JSON = JSON.stringify(NHBook, null, 4);

    return NHBook;
}
async function nHentaiSearch(query, page = 1) {
    const results = await nh.search(encodeURI(query), page);
    const urls = results.books.map(book => `https://nhentai.net/g/${book.id}/`);
    return urls;
}
async function sortSearch(query) {
    const results = await nh.search(encodeURI(query));
    results.books.sort((a, b) => lev(query, a.title.english) - lev(query, b.title.english));
    return results.books;
}
async function getMirror(title) {
    let books = await sortSearch(`"${title}"`);
    let nhmirror;
    if (!books.length) books = await sortSearch(title);
    if (books.length) {
        if (lev(title, books[0].title.english) < 30) nhmirror = `https://nhentai.net/g/${books[0].id}/`;
    }
    return nhmirror;
}
async function process_book(url){
    const id = url.match(/\b\d{1,6}\b/i)
    if (id.length) return await nHentaiBook(id[0])
}
exports.process_book = process_book
exports.fetchBook = nHentaiBook;
exports.searchBooks = nHentaiSearch;
exports.sortSearch = sortSearch;
exports.getMirror = getMirror;