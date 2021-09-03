const Discord = require('discord.js');
const { PREFIX, TOKEN, OWNER, GUILD } = require('./tokens.json');
const fs = require('fs-extra');
const twitter = require('./helpers/twitter')
const doujin = require('./helpers/doujin')
const JSONdb = require('simple-json-db')
const { context } = require('./context');

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
        Discord.Intents.FLAGS.GUILD_MEMBERS,
    ],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
    presence: { activities: [{ name: 'Illya sleep', type: 3 }] },
    restRequestTimeout: 60000
})
client.commands = new Discord.Collection();

client.datastore = new JSONdb('./db.json')

const commandFiles = fs.readdirSync('./cogs/').filter(f => f.endsWith('.js'));

commandFiles.forEach(cmd => {
    const command = require(`./cogs/${cmd}`);
    client.commands.set(command.name, command);
});
context.forEach(command => {
    client.commands.set(command.name, command);
})
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.username}`)
    await client.application.fetch()
    // GUILD is our home guild id
    const home = await client.guilds.fetch(GUILD)
    await setup_commands(client, home)
    const command_loader = {
        name: 'slash_loader',
        type: 'CHAT_INPUT',
        description: 'load commands in other guilds',
        defaultPermission: false,
        options: [{
            name: 'choice_of_guild',
            type: 'STRING',
            description: 'Guild to update interactions',
            required: true,
            choices: client.guilds.cache.map(g => {
                return { name: g.name, value: g.id }
            })
        }],
        async execute(interaction) {
            const guild = await client.guilds.fetch(interaction.options.data[0].value)
            if (!guild) return interaction.reply({ content: 'guild not found', ephemeral: true })
            await setup_commands(client, guild).then(ctx => interaction.reply({ content: `Loaded ${ctx.size} commands`, ephemeral: true }))
        }
    }
    client.commands.set(command_loader.name, command_loader)
    const loader = await home.commands.create(command_loader)
    loader.permissions.set({
        permissions: [{
            id: OWNER,
            type: 'USER',
            permission: true,
        },]
    })
    client.guilds.cache.forEach(guild => {
        if (!client.datastore.has(guild.id)) {
            client.datastore.set(guild.id, JSON.stringify({
                twitter_react: true,
                twitter_rehost: false,
                doujin: true,
            }))
        }
    })
})

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return
    if (client.datastore.has(message.author.id)) {
        if (JSON.parse(client.datastore.get(message.author.id)).ignore) return
    }
    if (message.content.startsWith(PREFIX)) handleCommand(message)
    const settings = JSON.parse(client.datastore.get(message.guild.id))

    // Display twitter image count
    if (message.content.match(twitter.re) && message.guild) {
        await twitter.process_message(message)
    }
    // Process doujin
    if (message.content.match(doujin.re) && settings.doujin) doujin.process_book(message)
})

client.on('messageReactionAdd', async (reaction, user) => {
    // Make sure the message is cached
    if (reaction.partial) await reaction.message.fetch()
    // And it's a message made by us
    if (user.client.user == user) return
    // Check if the user invoked this message before deleting
    if (['🗑️', '❌'].includes(reaction.emoji.name) && (reaction.message.author.id == client.user.id || (reaction.message.author.bot && client.datastore.has(reaction.message.id)))) {
        if (user.id == client.datastore.get(reaction.message.id)) {
            reaction.message.delete()
            client.datastore.delete(reaction.message.id)
        }
    }
})

client.on('messageDelete', async (message) => {
    if (message.author?.bot) return
    if (client.datastore.has(message.id)) {
        const messages = client.datastore.get(message.id)
        if (typeof messages == 'string') return
        for (msg of messages) {
            try {
            const bot_message = await message.channel.messages.fetch(msg)
            } catch (e) {
                if (e.message !== 'Unknown Message') console.error(e)
                continue
            }
            if (!bot_message) continue
            if (bot_message.author.id === client.user.id) await bot_message.delete().then(() => {
                client.datastore.delete(message.id)
                client.datastore.delete(bot_message.id)
            })
        }
    }
})
client.on('interactionCreate', async (interaction) => {
    if (['twitter_rehost', 'twitter_react', 'doujin'].includes(interaction.customId)) return config(interaction)
    if (['RoleMenu', 'RoleMenuSetup'].includes(interaction.customId) && interaction.guild) {
        try {
            const roleMenu = client.commands.get('role_menu')
            if (interaction.customId === 'RoleMenu') return roleMenu.menu(interaction)
            if (interaction.customId === 'RoleMenuSetup') return roleMenu.setup(interaction)
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
    if (!interaction.isContextMenu() && !interaction.isCommand()) return
    if (!client.commands.has(interaction.commandName)) return;

    try {
        await client.commands.get(interaction.commandName).execute(interaction);
    } catch (error) {
        console.error(error);
        return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
})

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
                cog.run(message, args);
            }
        }
        else { cog.run(message, args); }
    }
}
async function setup_commands(client, guild) {
    const owner = client.application.owner
    if (!guild) return
    console.log(`Loading commands for ${guild.name} ..`)
    const ctxcmds = await guild.commands.set(context)
    console.log(`Loaded ${ctxcmds.size} commands`)
    await ctxcmds.find(c => c.name == 'load_permissions').permissions.set({
        permissions: [{
            id: owner.id,
            type: 'USER',
            permission: true,
        },]
    })
    console.log(`Owner perms added for ${owner.username}`)
    return ctxcmds
}
async function config(interaction) {
    const settings = JSON.parse(interaction.client.datastore.get(interaction.guild.id))
    settings[interaction.customId] = !settings[interaction.customId]
    interaction.client.datastore.set(interaction.guild.id, JSON.stringify(settings))
    const row = new Discord.MessageActionRow()
    for (const [key, value] of Object.entries(settings)) {
        const button = new Discord.MessageButton()
            .setCustomId(key)
            .setLabel(key)
        if (value) button.setStyle('SUCCESS')
        else button.setStyle('DANGER')
        row.addComponents(button)
    }
    await interaction.update({ content: JSON.stringify(settings), components: [row], ephemeral: true })
}

process.on('unhandledRejection', error => {
    console.error('unhandled api error', error)
})

client.login(TOKEN)