module.exports = {
    name: 'ignore',
    description: 'ignore a user',
    permission: ['OWNER'],
    async run(message, args) {
        try {
            const db = message.client.datastore
            const user = message.mentions.members.first()
            let data = {}
            if (db.has(user.id)) data = JSON.parse(db.get(user.id))
            data.ignore ? data.ignore = false : data.ignore = true
            db.set(user.id, JSON.stringify(data))
        } catch (err) {
            console.error(err)
            return await message.react('❌').catch()
        }
        return await message.react('🆗').catch()
    },
};