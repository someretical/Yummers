import { Prisma } from '@prisma/client';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import Command from '../structures/Command';
import Yummers from '../structures/Yummers';
import { getEmbed } from '../util';

export default class Refresh extends Command {
    constructor(client: Yummers) {
        super({
            client: client,
            builder: new SlashCommandBuilder()
                .setName('refresh')
                .setDescription('Refresh certain data')
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('birthdays')
                        .setDescription('Refresh birthdays')
                        .addStringOption((option) =>
                            option.setName('guild-id').setDescription('Refresh a specific server')
                        )
                        .addStringOption((option) =>
                            option.setName('user-id').setDescription('Refresh a specific user')
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('interval')
                                .setDescription('Interval to refresh (ms)')
                                .setMinValue(0)
                                .setMaxValue(24 * 60 * 60 * 1000 - 60 * 1000)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('guild-user')
                        .setDescription('Refresh guild/user relationships')
                        .addStringOption((option) =>
                            option.setName('user-id').setDescription('Refresh a specific user')
                        )
                        .addStringOption((option) =>
                            option.setName('guild-id').setDescription('Refresh a specific guild')
                        )
                ),
            throttling: {
                usages: 0,
                duration: 0
            }
        });
    }

    async run(interaction: ChatInputCommandInteraction): Promise<void> {
        if (interaction.user.id !== process.env.OWNER_ID) {
            await interaction.reply({
                embeds: [getEmbed().setDescription('You are not the owner of this bot!')]
            });
        }

        switch (interaction.options.getSubcommand()) {
            case 'birthdays': {
                const guildId = interaction.options.getString('guild-id') || interaction.guildId;
                const userId = interaction.options.getString('user-id');
                const interval = interaction.options.getInteger('interval') || 24 * 60 * 60 * 1000 - 60 * 1000;

                const embed = getEmbed().addFields([
                    {
                        name: 'Guild ID',
                        value: !guildId ? 'All guilds' : this.client.guilds.cache.get(guildId)?.name || guildId
                    },
                    {
                        name: 'User ID',
                        value: !userId ? 'All users' : this.client.users.cache.get(userId)?.tag || userId
                    },
                    {
                        name: 'Interval',
                        value: `${interval}ms`
                    }
                ]);

                await interaction.reply({
                    embeds: [embed.setDescription(`Refreshing birthdays with following arguments:`)]
                });

                if (guildId && userId) {
                    this.client.currentBirthdays.get(guildId)?.delete(userId);
                } else if (guildId) {
                    this.client.currentBirthdays.get(guildId)?.clear();
                }

                await this.client.scanExpiredBirthdays();
                await this.client.scanNewBirthdays(interval, null, userId, guildId);

                await interaction.editReply({
                    embeds: [embed.setDescription(`Refreshed birthdays!`)]
                });

                break;
            }
            case 'guild-user': {
                const userId = interaction.options.getString('user-id');
                const guildId = interaction.options.getString('guild-id') || interaction.guildId;

                if (!guildId && userId) {
                    await interaction.reply({
                        embeds: [getEmbed().setDescription('Cannot provide userId alone!')]
                    });
                    return;
                }

                await interaction.deferReply();

                if (userId && guildId) {
                    try {
                        await this.client.prisma.guildUser.create({
                            data: {
                                guild_id: guildId,
                                user_id: userId
                            }
                        });
                        await interaction.editReply({
                            embeds: [
                                getEmbed().setDescription(
                                    `Added guild/user relationship between ${guildId} and ${userId}!`
                                )
                            ]
                        });
                    } catch (err) {
                        await interaction.editReply({
                            content: `\`\`\`\n${err}\n\`\`\``
                        });
                    }
                } else if (guildId) {
                    const members = await this.client.guilds.cache.get(guildId)?.members.fetch();

                    if (!members) {
                        await interaction.editReply({
                            embeds: [
                                getEmbed().setDescription(
                                    `No members found for guild ${interaction.guild?.name ?? guildId}!`
                                )
                            ]
                        });

                        return;
                    }

                    try {
                        const data = members
                            .filter((member) => !member.user.bot)
                            .map((member) => Prisma.sql`(${member.id}, ${guildId})`);
                        const total = data.length;

                        const chunked = [];
                        while (data.length) {
                            chunked.push(data.splice(0, 100));
                        }

                        const promises = [];

                        for (const chunk of chunked) {
                            promises.push(this.client.prisma.$executeRaw`
INSERT INTO "GuildUser" (user_id, guild_id)
SELECT new.user_id, new.guild_id
FROM
    (VALUES ${Prisma.join(chunk)}) AS new(user_id, guild_id)
WHERE
    EXISTS (SELECT 1 FROM "Guild" WHERE "Guild".id = new.guild_id)
    AND
    EXISTS (SELECT 1 FROM "User" WHERE "User".id = new.user_id)
ON CONFLICT DO NOTHING
;
`);
                        }

                        const result = await Promise.allSettled(promises);

                        await interaction.editReply({
                            embeds: [
                                getEmbed().setDescription(
                                    `Added ${result.reduce(
                                        (a, b) => a + (b.status === 'fulfilled' ? b.value : 0),
                                        0
                                    )} of ${total} potential guild/user relationships!`
                                )
                            ]
                        });
                    } catch (err) {
                        await interaction.editReply({
                            content: `\`\`\`\n${err}\n\`\`\``
                        });
                    }
                }

                break;
            }
        }
    }
}
