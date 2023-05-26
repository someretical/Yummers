"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const discord_js_1 = require("discord.js");
const Command_1 = __importDefault(require("../structures/Command"));
const util_1 = require("../util");
class Refresh extends Command_1.default {
    constructor(client) {
        super({
            client: client,
            builder: new discord_js_1.SlashCommandBuilder()
                .setName('refresh')
                .setDescription('Refresh certain data')
                .addSubcommand((subcommand) => subcommand
                .setName('birthdays')
                .setDescription('Refresh birthdays')
                .addStringOption((option) => option.setName('guildid').setDescription('Refresh a specific server'))
                .addStringOption((option) => option.setName('userid').setDescription('Refresh a specific user'))
                .addIntegerOption((option) => option
                .setName('interval')
                .setDescription('Interval to refresh (ms)')
                .setMinValue(0)
                .setMaxValue(24 * 60 * 60 * 1000 - 60 * 1000)))
                .addSubcommand((subcommand) => subcommand
                .setName('guilduser')
                .setDescription('Refresh guild/user relationships')
                .addStringOption((option) => option.setName('userid').setDescription('Refresh a specific user'))
                .addStringOption((option) => option.setName('guildid').setDescription('Refresh a specific guild')))
        });
    }
    async run(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) {
            await interaction.reply({
                embeds: [(0, util_1.getEmbed)().setDescription('You are not the owner of this bot!')]
            });
        }
        switch (interaction.options.getSubcommand()) {
            case 'birthdays': {
                const guildId = interaction.options.getString('guildid') || interaction.guildId;
                const userId = interaction.options.getString('userid');
                const interval = interaction.options.getInteger('interval') || 24 * 60 * 60 * 1000 - 60 * 1000;
                const embed = (0, util_1.getEmbed)().addFields([
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
                }
                else if (guildId) {
                    this.client.currentBirthdays.get(guildId)?.clear();
                }
                await this.client.scanExpiredBirthdays();
                await this.client.scanNewBirthdays(interval, null, userId, guildId);
                await interaction.editReply({
                    embeds: [embed.setDescription(`Refreshed birthdays!`)]
                });
                break;
            }
            case 'guilduser': {
                const userId = interaction.options.getString('userid');
                const guildId = interaction.options.getString('guildid') || interaction.guildId;
                if (!guildId && userId) {
                    await interaction.reply({
                        embeds: [(0, util_1.getEmbed)().setDescription('Cannot provide userId alone!')]
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
                                (0, util_1.getEmbed)().setDescription(`Added guild/user relationship between ${guildId} and ${userId}!`)
                            ]
                        });
                    }
                    catch (err) {
                        await interaction.editReply({
                            content: `\`\`\`\n${err}\n\`\`\``
                        });
                    }
                }
                else if (guildId) {
                    const members = await this.client.guilds.cache.get(guildId)?.members.fetch();
                    if (!members) {
                        await interaction.editReply({
                            embeds: [
                                (0, util_1.getEmbed)().setDescription(`No members found for guild ${interaction.guild?.name ?? guildId}!`)
                            ]
                        });
                        return;
                    }
                    try {
                        const data = members
                            .filter((member) => !member.user.bot)
                            .map((member) => client_1.Prisma.sql `(${member.id}, ${guildId})`);
                        const total = data.length;
                        const chunked = [];
                        while (data.length) {
                            chunked.push(data.splice(0, 100));
                        }
                        const promises = [];
                        for (const chunk of chunked) {
                            promises.push(this.client.prisma.$executeRaw `
INSERT INTO "GuildUser" (user_id, guild_id)
SELECT new.user_id, new.guild_id
FROM
    (VALUES ${client_1.Prisma.join(chunk)}) AS new(user_id, guild_id)
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
                                (0, util_1.getEmbed)().setDescription(`Added ${result.reduce((a, b) => a + (b.status === 'fulfilled' ? b.value : 0), 0)} of ${total} potential guild/user relationships!`)
                            ]
                        });
                    }
                    catch (err) {
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
exports.default = Refresh;
