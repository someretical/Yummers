import BirthdayClient from '../structures/BirthdayClient';
import Command from '../structures/Command';
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
import { Guild as PrismaGuild } from '@prisma/client';
import { getEmbed } from '../util/EmbedHelper';
import { databaseError } from '../util/Database';

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
                .addSubcommand((subcommand) => subcommand.setName('view').setDescription('View server settings'))
                .addSubcommand((subcommand) =>
                    subcommand.setName('enablebirthdays').setDescription('Enable birthday announcements')
                )
                .addSubcommand((subcommand) =>
                    subcommand.setName('disablebirthdays').setDescription('Disable birthday announcements')
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('birthdaychannel')
                        .setDescription('Set the birthday announcement channel')
                        .addChannelOption((option) =>
                            option
                                .setName('channel')
                                .setDescription('The channel to send birthday announcements to')
                                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('birthdayrole')
                        .setDescription('Set the birthday role')
                        .addRoleOption((option) =>
                            option
                                .setName('role')
                                .setDescription('The role to give to users on their birthday')
                                .setRequired(true)
                        )
                )
        });
    }

    async run(interaction: ChatInputCommandInteraction): Promise<void> {
        const guild = interaction.guild as Guild;

        switch (interaction.options.getSubcommand(true)) {
            case 'view': {
                let pGuild: null | PrismaGuild = null;

                try {
                    pGuild = await this.client.prisma.guild.upsert({
                        where: {
                            id: interaction.guildId as string
                        },
                        update: {},
                        create: {
                            id: interaction.guildId as string,
                            birthday_channel_id: null,
                            birthday_role_id: null
                        }
                    });
                } catch (err) {
                    return databaseError(interaction);
                }

                const channel = guild.channels.cache.get(pGuild.birthday_channel_id ?? '0') as
                    | BaseGuildTextChannel
                    | undefined;
                const channelPermissions = channel ? await validateChannel(channel) : false;

                const role = guild.roles.cache.get(pGuild.birthday_role_id ?? '0') as Role | undefined;
                const rolePermissions = role ? await validateRole(role) : false;

                interaction.reply({
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
                                    value: `${channel?.toString() ?? 'Not set'} ${
                                        channelPermissions || !channel ? '' : '(missing permissions)'
                                    }`
                                },
                                {
                                    name: 'Birthday role',
                                    value: `${role?.toString() ?? 'Not set'} ${
                                        rolePermissions || !role ? '' : ' (missing permissions)'
                                    }`
                                }
                            ])
                    ]
                });

                break;
            }
            case 'enablebirthdays': {
                try {
                    await this.client.prisma.guild.upsert({
                        where: {
                            id: interaction.guildId as string
                        },
                        update: {
                            birthdays_enabled: true
                        },
                        create: {
                            id: interaction.guildId as string,
                            birthday_channel_id: null,
                            birthday_role_id: null
                        }
                    });
                } catch (err) {
                    return databaseError(interaction);
                }

                interaction.reply({
                    embeds: [getEmbed().setDescription('Enabled birthday announcements')]
                });

                break;
            }
            case 'disablebirthdays': {
                try {
                    await this.client.prisma.guild.upsert({
                        where: {
                            id: interaction.guildId as string
                        },
                        update: {
                            birthdays_enabled: false
                        },
                        create: {
                            id: interaction.guildId as string,
                            birthday_channel_id: null,
                            birthday_role_id: null
                        }
                    });
                } catch (err) {
                    return databaseError(interaction);
                }

                interaction.reply({
                    embeds: [getEmbed().setDescription('Disabled birthday announcements')]
                });

                break;
            }
            case 'birthdaychannel': {
                const channel: TextChannel | NewsChannel = interaction.options.getChannel('channel', true);

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

                try {
                    await this.client.prisma.guild.upsert({
                        where: {
                            id: interaction.guildId as string
                        },
                        update: {
                            birthday_channel_id: channel.id
                        },
                        create: {
                            id: interaction.guildId as string,
                            birthday_role_id: null
                        }
                    });
                } catch (err) {
                    return databaseError(interaction);
                }

                interaction.reply({
                    embeds: [getEmbed().setDescription(`Set the birthday channel to ${channel.toString()}`)]
                });

                break;
            }
            case 'birthdayrole': {
                const role = interaction.options.getRole('role', true) as Role;

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

                try {
                    await this.client.prisma.guild.upsert({
                        where: {
                            id: interaction.guildId as string
                        },
                        update: {
                            birthday_role_id: role.id
                        },
                        create: {
                            id: interaction.guildId as string,
                            birthday_channel_id: null
                        }
                    });
                } catch (err) {
                    return databaseError(interaction);
                }

                interaction.reply({
                    embeds: [getEmbed().setDescription(`Set the birthday role to ${role.toString()}`)]
                });

                break;
            }
        }
    }
}
