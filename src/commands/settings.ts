import { Guild as PrismaGuild } from '@prisma/client';
import {
    BaseGuildTextChannel,
    ChannelType,
    ChatInputCommandInteraction,
    Guild,
    NewsChannel,
    PermissionsBitField,
    Role,
    SlashCommandBuilder,
    TextChannel
} from 'discord.js';
import BirthdayClient from '../structures/BirthdayClient';
import Command from '../structures/Command';
import { DatabaseErrorType, databaseError } from '../util/Database';
import { getEmbed } from '../util/EmbedHelper';

async function validateChannel(channel: BaseGuildTextChannel): Promise<boolean> {
    const me = await channel.guild.members.fetchMe();
    const permissions = channel.permissionsFor(me);

    return (
        permissions.has(PermissionsBitField.Flags.ViewChannel) &&
        permissions.has(PermissionsBitField.Flags.SendMessages) &&
        permissions.has(PermissionsBitField.Flags.EmbedLinks) &&
        permissions.has(PermissionsBitField.Flags.AttachFiles)
    );
}

async function validateRole(role: Role): Promise<boolean> {
    const me = await role.guild.members.fetchMe();

    return me.roles.highest.comparePositionTo(role) > 0 && me.permissions.has(PermissionsBitField.Flags.ManageRoles);
}

export default class Settings extends Command {
    constructor(client: BirthdayClient) {
        super({
            client: client,
            builder: new SlashCommandBuilder()
                .setName('settings')
                .setDescription('View/set server specific settings')
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
                .setDMPermission(false)
                .addStringOption((option) =>
                    option
                        .setName('announcements')
                        .setDescription('Enable/disable birthday announcements')
                        .addChoices({ name: 'Enabled', value: '1' }, { name: 'Disabled', value: '0' })
                )
                .addStringOption((option) =>
                    option
                        .setName('message')
                        .setDescription('The birthday message, use {user} to mention the user')
                        .setMinLength(1)
                        .setMaxLength(1024)
                )
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The channel to send birthday announcements to')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                )
                .addRoleOption((option) =>
                    option.setName('role').setDescription('The role to give to users on their birthday')
                )
        });
    }

    async run(interaction: ChatInputCommandInteraction): Promise<void> {
        const guild = interaction.guild as Guild;
        let pGuild: null | PrismaGuild = null;

        const enabled = interaction.options.getString('announcements')
            ? interaction.options.getString('announcements') === '1'
            : null;
        const message = interaction.options.getString('message');
        const channel: TextChannel | NewsChannel | null = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role') as Role | null;

        interface UpdateObject {
            id?: string;
            birthdays_enabled?: boolean;
            birthday_message?: string;
            birthday_channel_id?: string;
            birthday_role_id?: string;
        }
        const upsertObject: UpdateObject = {};
        if (enabled !== null) upsertObject['birthdays_enabled'] = enabled;
        if (message) upsertObject['birthday_message'] = message;

        if (channel) {
            if (!(await validateChannel(channel))) {
                await interaction.reply({
                    embeds: [
                        getEmbed().setDescription(
                            `The bot does not have the required permissions in ${channel.toString()}!`
                        )
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
                        getEmbed().setDescription(
                            `The bot does not have the required permissions to manage ${role.toString()}!`
                        )
                    ]
                });
                return;
            }

            upsertObject['birthday_role_id'] = role.id;
        }

        const copy = structuredClone(upsertObject);

        interface CreateObject {
            id: string;
            birthdays_enabled?: boolean;
            birthday_message?: string;
            birthday_channel_id?: string;
            birthday_role_id?: string;
        }
        copy['id'] = interaction.guildId as string;

        try {
            pGuild = await this.client.prisma.guild.upsert({
                where: {
                    id: interaction.guildId as string
                },
                update: upsertObject,
                create: copy as CreateObject
            });
        } catch (err) {
            return databaseError(err, DatabaseErrorType.Write, interaction);
        }

        const cacheChannel = guild.channels.cache.get(pGuild.birthday_channel_id ?? '0') as
            | BaseGuildTextChannel
            | undefined;
        const channelPermissions = channel ? await validateChannel(channel) : false;

        const cacheRole = guild.roles.cache.get(pGuild.birthday_role_id ?? '0') as Role | undefined;
        const rolePermissions = role ? await validateRole(role) : false;

        await interaction.reply({
            embeds: [
                getEmbed()
                    .setAuthor({
                        name: guild.name,
                        iconURL: guild.iconURL() as string
                    })
                    .addFields([
                        {
                            name: 'Birthday announcements',
                            value: pGuild.birthdays_enabled ? 'Enabled' : 'Disabled'
                        },
                        {
                            name: 'Birthday channel',
                            value: `${cacheChannel?.toString() ?? 'Not set'} ${
                                channelPermissions || !channel ? '' : '(missing permissions)'
                            }`
                        },
                        {
                            name: 'Birthday role',
                            value: `${cacheRole?.toString() ?? 'Not set'} ${
                                rolePermissions || !role ? '' : ' (missing permissions)'
                            }`
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
