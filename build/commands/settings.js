"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const Command_1 = __importDefault(require("../structures/Command"));
const Database_1 = require("../util/Database");
const EmbedHelper_1 = require("../util/EmbedHelper");
async function validateChannel(channel) {
    const me = await channel.guild.members.fetchMe();
    const permissions = channel.permissionsFor(me);
    return (permissions.has(discord_js_1.PermissionsBitField.Flags.ViewChannel) &&
        permissions.has(discord_js_1.PermissionsBitField.Flags.SendMessages) &&
        permissions.has(discord_js_1.PermissionsBitField.Flags.EmbedLinks) &&
        permissions.has(discord_js_1.PermissionsBitField.Flags.AttachFiles));
}
async function validateRole(role) {
    const me = await role.guild.members.fetchMe();
    return me.roles.highest.comparePositionTo(role) > 0 && me.permissions.has(discord_js_1.PermissionsBitField.Flags.ManageRoles);
}
class Settings extends Command_1.default {
    constructor(client) {
        super({
            client: client,
            builder: new discord_js_1.SlashCommandBuilder()
                .setName('settings')
                .setDescription('View/set server specific settings')
                .setDefaultMemberPermissions(discord_js_1.PermissionsBitField.Flags.ManageGuild)
                .setDMPermission(false)
                .addStringOption((option) => option
                .setName('announcements')
                .setDescription('Enable/disable birthday announcements')
                .addChoices({ name: 'Enabled', value: '1' }, { name: 'Disabled', value: '0' }))
                .addStringOption((option) => option
                .setName('message')
                .setDescription('The birthday message, use {user} to mention the user')
                .setMinLength(1)
                .setMaxLength(1024))
                .addChannelOption((option) => option
                .setName('channel')
                .setDescription('The channel to send birthday announcements to')
                .addChannelTypes(discord_js_1.ChannelType.GuildText, discord_js_1.ChannelType.GuildAnnouncement))
                .addRoleOption((option) => option.setName('role').setDescription('The role to give to users on their birthday'))
        });
    }
    async run(interaction) {
        const guild = interaction.guild;
        let pGuild = null;
        const enabled = interaction.options.getString('announcements')
            ? interaction.options.getString('announcements') === '1'
            : null;
        const message = interaction.options.getString('message');
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const upsertObject = {};
        if (enabled !== null)
            upsertObject['birthdays_enabled'] = enabled;
        if (message)
            upsertObject['birthday_message'] = message;
        if (channel) {
            if (!(await validateChannel(channel))) {
                await interaction.reply({
                    embeds: [
                        (0, EmbedHelper_1.getEmbed)().setDescription(`The bot does not have the required permissions in ${channel.toString()}!`)
                    ]
                });
                return;
            }
            upsertObject['birthday_channel_id'] = channel.id;
        }
        if (role) {
            if (!(await validateRole(role))) {
                await interaction.reply({
                    embeds: [
                        (0, EmbedHelper_1.getEmbed)().setDescription(`The bot does not have the required permissions to manage ${role.toString()}!`)
                    ]
                });
                return;
            }
            upsertObject['birthday_role_id'] = role.id;
        }
        const copy = structuredClone(upsertObject);
        copy['id'] = interaction.guildId;
        try {
            pGuild = await this.client.prisma.guild.upsert({
                where: {
                    id: interaction.guildId
                },
                update: upsertObject,
                create: copy
            });
        }
        catch (err) {
            return (0, Database_1.databaseError)(err, Database_1.DatabaseErrorType.Write, interaction);
        }
        const cacheChannel = guild.channels.cache.get(pGuild.birthday_channel_id ?? '0');
        const channelPermissions = channel ? await validateChannel(channel) : false;
        const cacheRole = guild.roles.cache.get(pGuild.birthday_role_id ?? '0');
        const rolePermissions = role ? await validateRole(role) : false;
        await interaction.reply({
            embeds: [
                (0, EmbedHelper_1.getEmbed)()
                    .setAuthor({
                    name: guild.name,
                    iconURL: guild.iconURL()
                })
                    .addFields([
                    {
                        name: 'Birthday announcements',
                        value: pGuild.birthdays_enabled ? 'Enabled' : 'Disabled'
                    },
                    {
                        name: 'Birthday channel',
                        value: `${cacheChannel?.toString() ?? 'Not set'} ${channelPermissions || !channel ? '' : '(missing permissions)'}`
                    },
                    {
                        name: 'Birthday role',
                        value: `${cacheRole?.toString() ?? 'Not set'} ${rolePermissions || !role ? '' : ' (missing permissions)'}`
                    },
                    {
                        name: 'Birthday message',
                        value: pGuild.birthday_message
                    }
                ])
            ]
        });
    }
}
exports.default = Settings;
