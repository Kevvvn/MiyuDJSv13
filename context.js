const { MessageActionRow, MessageSelectMenu, MessageEmbed } = require('discord.js');
const deleteMessage = {
    name: 'Delete my message',
    type: 'MESSAGE',
    async execute(interaction) {
        const message = interaction.options.getMessage('message')
        if (message.author.bot == true && interaction.client.datastore.has(message.id)) {
            if (interaction.user.id == interaction.client.datastore.get(message.id)) return await message.delete().then(interaction.reply({ content: 'Message deleted.', ephemeral: true }))
        } else return interaction.reply({ content: 'Permission denied.', ephemeral: true })

    }
}
const favorite = {
    name: 'Favorite this book',
    type: 'MESSAGE',
    defaultPermission: false,
    async execute(interaction) {
        interaction.reply({ content: 'Not implemented yet', ephemeral: true })
    }
}
const roleMenu = {
    name: 'role_menu',
    type: 'CHAT_INPUT',
    description: 'Set-up a role menu',
    defaultPermission: false,
    async execute(interaction) {
        const roles = await interaction.guild.roles.fetch()
        // We only want roles that have color, and that the bot can assign 
        const roleOptions = roles.filter(role => role.hexColor !== '#000000' && role.editable).map(role => {
            return {
                value: role.id,
                label: role.name,
                description: role.hexColor
            }
        })
        if (!roleOptions.length) return interaction.reply({ content: `There are no roles I can add.\n Make sure every color role is below my highest role and that I have the \`MANAGE_ROLES\` permission.`, embeds: [], components: [], ephemeral: true })
        const row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId('RoleMenuSetup')
                    .setPlaceholder('Select all roles to display')
                    .setMinValues(1)
                    .setMaxValues(roleOptions.length)
                    .addOptions(roleOptions)
            )

        const MenuEmbed = new MessageEmbed()
            .setColor('FF0000')
            .setTitle('Role Menu Setup')
            .setDescription('Select the roles to display in the role menu.')

        return interaction.reply({ embeds: [MenuEmbed], components: [row], ephemeral: true })
    },
    async setup(interaction) {
        if (!interaction.values) return
        roles = interaction.values.map(value => {
            role = interaction.guild.roles.cache.get(value)
            return {
                value: role.id,
                label: role.name,
                description: role.hexColor
            }
        })
        const row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId('RoleMenu')
                    .setPlaceholder('Select a role colour')
                    .addOptions(roles)
            )

        const MenuEmbed = new MessageEmbed()
            .setColor('39FF14')
            .setTitle('Role Colour')
            .setDescription('Receive a role colour by selecting one from this menu')
        // The setup menu becomes the role menu
        try {
            const d = await interaction.channel.send({ embeds: [MenuEmbed], components: [row] })
            interaction.client.datastore.set(d.id, interaction.user.id)
            return interaction.update({ content: 'Role menu is now ready', components: [], ephemeral: true })
        } catch (error) {
            if (error.message == 'Missing Access') return interaction.update({ content: `I lack the permissions to send messages to this channel.`, components: [], embeds: [], ephemeral: true })
            else return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    },
    async menu(interaction) {
        const role = interaction.guild.roles.cache.get(interaction.values[0])
        // Remove all the role options from the user before adding their choice
        await interaction.member.roles.remove(interaction.component.options.map(option => option.value))
        await interaction.member.roles.add(role)
        return await interaction.reply({ content: `You have been assigned the \`${role.name.replace(/\b\w/g, l => l.toUpperCase())}\` role colour`, ephemeral: true })
    }
}
const commands = [deleteMessage, favorite, roleMenu]

const loadPerms = {
    name: 'load_permissions',
    type: 'CHAT_INPUT',
    description: 'Enable command',
    defaultPermission: false,
    options: [{
        name: 'choice_of_command',
        type: 'STRING',
        description: 'Command to update permission',
        required: true,
        choices: commands.map(c => {
            return { name: c.description ?? c.name, value: c.name }
        })
    }],
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true })
        await interaction.guild.members.fetch({ time: 60000 }).catch(console.error)
        const perm = [{
            id: interaction.user.id,
            type: 'USER',
            permission: true,
        },]
        const admins = interaction.guild.members.cache.filter(u => u.permissions.has('ADMINISTRATOR'))
        admins.forEach(admin => {
            perm.push({
                id: admin.id,
                type: 'USER',
                permission: true
            })
        });
        command = await interaction.guild.commands.cache.find(c => c.name == interaction.options.data[0].value)
        await command.permissions.add({ permissions: perm })
        interaction.editReply({ content: 'added perm', ephemeral: true })
    }
}
commands.push(loadPerms)
module.exports = commands