"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const luxon_1 = require("luxon");
const Command_1 = __importDefault(require("../structures/Command"));
const Birthday_1 = require("../util/Birthday");
const Database_1 = require("../util/Database");
const EmbedHelper_1 = require("../util/EmbedHelper");
class Birthday extends Command_1.default {
    constructor(client) {
        super({
            client: client,
            builder: new discord_js_1.SlashCommandBuilder()
                .setName('birthday')
                .setDescription('All about birthdays')
                .addSubcommand((subcommand) => subcommand
                .setName('set')
                .setDescription('Set your birthday')
                .addStringOption((option) => option
                .setName('month')
                .setDescription('The month of your birthday')
                .setRequired(true)
                .setChoices({ name: 'January', value: '1' }, { name: 'February', value: '2' }, { name: 'March', value: '3' }, { name: 'April', value: '4' }, { name: 'May', value: '5' }, { name: 'June', value: '6' }, { name: 'July', value: '7' }, { name: 'August', value: '8' }, { name: 'September', value: '9' }, { name: 'October', value: '10' }, { name: 'November', value: '11' }, { name: 'December', value: '12' }))
                .addIntegerOption((option) => option
                .setName('day')
                .setDescription('The day of your birthday')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(31))
                .addIntegerOption((option) => option
                .setName('hour')
                .setDescription('The hour of your birthday')
                .setMinValue(0)
                .setMaxValue(23))
                .addIntegerOption((option) => option
                .setName('minute')
                .setDescription('The minute of your birthday')
                .setMinValue(0)
                .setMaxValue(59))
                .addIntegerOption((option) => option
                .setName('utc-hour-offset')
                .setDescription('UTC hour offset')
                .setMinValue(-11)
                .setMaxValue(11))
                .addIntegerOption((option) => option
                .setName('utc-minute-offset')
                .setDescription('UTC minute offset')
                .setMinValue(0)
                .setMaxValue(59))
                .addStringOption((option) => option
                .setName('userid')
                .setDescription('The user to set the birthday of. Will NOT work if you are not the owner!')))
                .addSubcommand((subcommand) => subcommand
                .setName('get')
                .setDescription('Retrieve a birthday')
                .addUserOption((option) => option.setName('user').setDescription('The user to get the birthday of')))
                .addSubcommand((subcommand) => subcommand
                .setName('upcoming')
                .setDescription('Get a list of upcoming birthdays in the current server')
                .addIntegerOption((option) => option
                .setName('year')
                .setDescription('The year to get upcoming birthdays for')
                .setMinValue(1970)
                .setMaxValue(2100)))
                .addSubcommand((subcommand) => subcommand
                .setName('twins')
                .setDescription('Find people with the same birthday!')
                .addUserOption((option) => option.setName('user').setDescription('The user to find twins for')))
                .addSubcommand((subcommand) => subcommand
                .setName('remove')
                .setDescription('Remove your birthday from this server')
                .addUserOption((option) => option
                .setName('userid')
                .setDescription('The user to remove the birthday of. Will NOT work if you are not the owner!')))
                .addSubcommand((subcommand) => subcommand
                .setName('removeglobal')
                .setDescription('Remove your birthday globally')
                .addStringOption((option) => option
                .setName('userid')
                .setDescription('The user to remove the birthday of. Will NOT work if you are not the owner!')))
        });
    }
    async run(interaction) {
        switch (interaction.options.getSubcommand()) {
            case 'set': {
                /*
                Assuming the user's birthday is the 5th Jan UTC+10:00.
                This means they experience their birthday on the 5th Jan at 12:00 AM and their region is 10 hours ahead of UTC.
                The bot will have to celebrate their birthday at 14:00 UTC+00:00 on the 4th Jan.
                The role will have to be removed at 14:00 UTC+00:00 on the 5th Jan.

                Taken to the extrem, if the user's birthday is the 5th Jan UTC+11:59.
                The bot will have to celebrate their birthday at 11:59 UTC+00:00 on the 4th Jan.

                Assuming the user's birthday is on the 5th of Jan UTC-10:00.
                This means they experience their birthday on the 5th Jan at 12:00 AM and their region is 10 hours behind UTC.
                The bot will have to celebrate their birthday at 10:00 UTC+00:00 on the 5th Jan.
                The role will have to be removed at 10:00 UTC+00:00 on the 6th Jan.

                Taken to the extreme, if the user's birthday is the 5th Jan UTC-11:59.
                The bot will have to celebrate their birthday at 11:59 UTC+00:00 on the 6th Jan.

                When the user provides their birthday + timezone offset, the bot converts that date along with their offset to UTC.
                2023-05-19T00:00:00.000+10:00 -> 2023-05-18T14:00:00.000Z

                The offset is still stored so that the original date can be displayed to the user.
                */
                const month = interaction.options.getString('month');
                const day = interaction.options.getInteger('day');
                const hour = interaction.options.getInteger('hour') || 0;
                const minute = interaction.options.getInteger('minute') || 0;
                const hourOffset = interaction.options.getInteger('utc-hour-offset') ?? 0;
                const minuteOffset = interaction.options.getInteger('utc-minute-offset') ?? 0;
                const offset = luxon_1.FixedOffsetZone.instance(hourOffset * 60 + (hourOffset < 0 ? -minuteOffset : minuteOffset));
                const birthday = luxon_1.DateTime.fromObject({ year: 2000, month: parseInt(month), day: day, hour: hour, minute: minute }, { zone: offset });
                if (!birthday.isValid) {
                    interaction.reply({
                        embeds: [(0, EmbedHelper_1.getEmbed)().setDescription('Please provide a valid date!')]
                    });
                    return;
                }
                const utcBirthdayString = birthday.toUTC().toFormat('LLddHHmm');
                const id = (interaction.user.id === process.env.OWNER_ID
                    ? interaction.options.getString('userid')
                    : interaction.user.id) || interaction.user.id;
                try {
                    const statements = [
                        this.client.prisma.$executeRaw `
INSERT INTO "User" (id, birthday_utc, birthday_utc_offset)
VALUES (${id}, ${utcBirthdayString}, ${offset.offset(0)})
ON CONFLICT ON CONSTRAINT "User_pkey" 
DO UPDATE SET 
    birthday_utc = ${utcBirthdayString},
    birthday_utc_offset = ${offset.offset(0)}
;
`
                    ];
                    if (interaction.guildId) {
                        statements.push(this.client.prisma.$executeRaw `
INSERT INTO "GuildUser" (user_id, guild_id)
SELECT new.user_id, new.guild_id
FROM 
    (VALUES (${id}, ${interaction.guildId})) AS new(user_id, guild_id)
WHERE
    EXISTS (SELECT 1 FROM "Guild" WHERE "Guild".id = new.guild_id)
ON CONFLICT DO NOTHING
;
`);
                    }
                    await this.client.prisma.$transaction(statements);
                }
                catch (err) {
                    return (0, Database_1.databaseError)(err, Database_1.DatabaseErrorType.Write, interaction);
                }
                interaction.reply({
                    embeds: [
                        (0, EmbedHelper_1.getEmbed)().setDescription(`${interaction.user.id === id ? 'Your' : `<@${id}>'s`} birthday has been set to ${birthday.toFormat("LLLL d h:mm a ('UTC' ZZ)")}`)
                    ]
                });
                break;
            }
            case 'get': {
                const user = interaction.options.getUser('user') ?? interaction.user;
                let userData = null;
                try {
                    userData = await this.client.prisma.user.findUnique({
                        where: { id: user.id }
                    });
                }
                catch (err) {
                    return (0, Database_1.databaseError)(err, Database_1.DatabaseErrorType.Read, interaction);
                }
                if (!userData) {
                    interaction.reply({
                        embeds: [
                            (0, EmbedHelper_1.getEmbed)().setDescription(user.id === interaction.user.id
                                ? 'You have not set your birthday!'
                                : 'This user has not set their birthday!')
                        ]
                    });
                    return;
                }
                const birthday = (0, Birthday_1.stringToBirthday)(userData.birthday_utc, userData.birthday_utc_offset, 2000);
                interaction.reply({
                    embeds: [
                        (0, EmbedHelper_1.getEmbed)()
                            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                            .addFields([
                            {
                                name: 'Birthday',
                                value: birthday.toFormat("LLLL d h:mm a ('UTC' ZZ)")
                            },
                            {
                                name: 'Messages',
                                value: userData.accept_birthday_messages ? 'Enabled' : 'Disabled'
                            }
                        ])
                    ]
                });
                break;
            }
            case 'upcoming': {
                if (!interaction.guildId) {
                    await interaction.reply({
                        embeds: [(0, EmbedHelper_1.getEmbed)().setDescription('This command can only be used in a server!')]
                    });
                    return;
                }
                let startWindow = luxon_1.DateTime.utc();
                let endWindow = startWindow.plus({ years: 1 });
                if (interaction.options.getInteger('year')) {
                    const year = interaction.options.getInteger('year');
                    startWindow = luxon_1.DateTime.fromObject({ year }).startOf('year');
                    endWindow = startWindow.endOf('year');
                }
                const startWindowString = startWindow.toFormat('LLddHHmm');
                const endWindowString = endWindow.toFormat('LLddHHmm');
                const conditions = {
                    where: {
                        guild_id: interaction.guildId,
                        user: {}
                    },
                    select: {
                        user: {
                            select: {
                                id: true,
                                birthday_utc: true,
                                birthday_utc_offset: true
                            }
                        }
                    },
                    orderBy: {
                        user: {
                            birthday_utc: 'asc'
                        }
                    }
                };
                // If the window crosses years, then the start must be in the previous year and the end must be in the next year.
                if (startWindow.year !== endWindow.year) {
                    const prevYearEndString = startWindow.endOf('year').toFormat('LLddHHmm');
                    const curYearStartString = endWindow.startOf('year').toFormat('LLddHHmm');
                    conditions.where.user['OR'] = [
                        {
                            AND: [
                                {
                                    birthday_utc: {
                                        gte: startWindowString
                                    }
                                },
                                {
                                    birthday_utc: {
                                        lte: prevYearEndString
                                    }
                                }
                            ]
                        },
                        {
                            AND: [
                                {
                                    birthday_utc: {
                                        gte: curYearStartString
                                    }
                                },
                                {
                                    birthday_utc: {
                                        lte: endWindowString
                                    }
                                }
                            ]
                        }
                    ];
                }
                else {
                    conditions.where.user['AND'] = [
                        {
                            birthday_utc: {
                                gte: startWindowString
                            }
                        },
                        {
                            birthday_utc: {
                                lte: endWindowString
                            }
                        }
                    ];
                }
                const result = (await this.client.prisma.guildUser.findMany(conditions));
                if (!result.length) {
                    await interaction.reply({
                        embeds: [(0, EmbedHelper_1.getEmbed)().setDescription('There are no upcoming birthdays :(')]
                    });
                    return;
                }
                const nextYearBirthdays = result.filter(({ user }) => user.birthday_utc < startWindowString);
                const currentYearBirthdays = result.filter(({ user }) => user.birthday_utc >= startWindowString);
                const strings = [];
                for (const { user } of currentYearBirthdays) {
                    const birthday = (0, Birthday_1.stringToBirthday)(user.birthday_utc, user.birthday_utc_offset, startWindow.year);
                    strings.push(`<@${user.id}>: ${birthday.toFormat("LLLL d h:mm a yyyy ('UTC' ZZ)")}`);
                }
                for (const { user } of nextYearBirthdays) {
                    const birthday = (0, Birthday_1.stringToBirthday)(user.birthday_utc, user.birthday_utc_offset, endWindow.year);
                    strings.push(`<@${user.id}>: ${birthday.toFormat("LLLL d h:mm a yyyy ('UTC' ZZ)")}`);
                }
                const guild = interaction.guild;
                // TODO implement some sort of pagination...
                await interaction.reply({
                    embeds: [
                        (0, EmbedHelper_1.getEmbed)()
                            .setAuthor({
                            name: guild.name,
                            iconURL: guild.iconURL()
                        })
                            .setTitle('Upcoming birthdays')
                            .setDescription(strings.join('\n'))
                    ]
                });
                break;
            }
            case 'twins': {
                if (!interaction.guildId) {
                    await interaction.reply({
                        embeds: [(0, EmbedHelper_1.getEmbed)().setDescription('This command can only be used in a server!')]
                    });
                    return;
                }
                const user = interaction.options.getUser('user') ?? interaction.user;
                let userData = null;
                try {
                    userData = await this.client.prisma.user.findUnique({
                        where: { id: user.id }
                    });
                }
                catch (err) {
                    return (0, Database_1.databaseError)(err, Database_1.DatabaseErrorType.Read, interaction);
                }
                if (!userData) {
                    interaction.reply({
                        embeds: [
                            (0, EmbedHelper_1.getEmbed)().setDescription(user.id === interaction.user.id
                                ? 'You have not set your birthday!'
                                : 'This user has not set their birthday!')
                        ]
                    });
                    return;
                }
                const startWindow = luxon_1.DateTime.fromObject({
                    year: 2000,
                    month: parseInt(userData.birthday_utc.substring(0, 2)),
                    day: parseInt(userData.birthday_utc.substring(2, 4))
                }).startOf('day');
                const endWindow = startWindow.endOf('day');
                const startWindowString = startWindow.toFormat('LLddHHmm');
                const endWindowString = endWindow.toFormat('LLddHHmm');
                const result = (await this.client.prisma.guildUser.findMany({
                    where: {
                        guild_id: interaction.guildId,
                        user: {
                            AND: [
                                {
                                    id: {
                                        not: user.id
                                    }
                                },
                                {
                                    birthday_utc: {
                                        gte: startWindowString
                                    }
                                },
                                {
                                    birthday_utc: {
                                        lte: endWindowString
                                    }
                                }
                            ]
                        }
                    },
                    select: {
                        user: {
                            select: {
                                id: true,
                                birthday_utc: true,
                                birthday_utc_offset: true
                            }
                        }
                    },
                    orderBy: {
                        user: {
                            birthday_utc: 'asc'
                        }
                    }
                }));
                if (!result.length) {
                    await interaction.reply({
                        embeds: [(0, EmbedHelper_1.getEmbed)().setDescription('There are no twins :(')]
                    });
                    return;
                }
                const strings = [];
                for (const { user } of result) {
                    const birthday = (0, Birthday_1.stringToBirthday)(user.birthday_utc, user.birthday_utc_offset, startWindow.year);
                    strings.push(`<@${user.id}>: ${birthday.toFormat("h:mm a ('UTC' ZZ)")}`);
                }
                const guild = interaction.guild;
                await interaction.reply({
                    embeds: [
                        (0, EmbedHelper_1.getEmbed)()
                            .setAuthor({
                            name: guild.name,
                            iconURL: guild.iconURL()
                        })
                            .setTitle('Birthday twins')
                            .setDescription(strings.join('\n'))
                    ]
                });
                break;
            }
            case 'remove': {
                if (!interaction.guildId) {
                    await interaction.reply({
                        embeds: [(0, EmbedHelper_1.getEmbed)().setDescription('This command can only be used in a server!')]
                    });
                    return;
                }
                const userId = (interaction.user.id === process.env.OWNER_ID
                    ? interaction.options.getString('userid')
                    : interaction.user.id) || interaction.user.id;
                try {
                    await this.client.prisma.guildUser.delete({
                        where: {
                            guild_id_user_id: {
                                guild_id: interaction.guildId,
                                user_id: userId
                            }
                        }
                    });
                }
                catch (err) {
                    return (0, Database_1.databaseError)(err, Database_1.DatabaseErrorType.Write, interaction);
                }
                await interaction.reply({
                    embeds: [
                        (0, EmbedHelper_1.getEmbed)().setDescription(`Removed ${userId === interaction.user.id ? 'your' : `<@${userId}>'s`} birthday from this server.`)
                    ],
                    ephemeral: true
                });
                break;
            }
            case 'removeglobal': {
                const userId = (interaction.user.id === process.env.OWNER_ID
                    ? interaction.options.getString('userid')
                    : interaction.user.id) || interaction.user.id;
                try {
                    await this.client.prisma.user.delete({
                        where: {
                            id: userId
                        }
                    });
                }
                catch (err) {
                    return (0, Database_1.databaseError)(err, Database_1.DatabaseErrorType.Write, interaction);
                }
                await interaction.reply({
                    embeds: [
                        (0, EmbedHelper_1.getEmbed)().setDescription(`Removed ${userId === interaction.user.id ? 'your' : `<@${userId}>'s`} birthday globally.`)
                    ],
                    ephemeral: true
                });
                break;
            }
        }
    }
}
exports.default = Birthday;
