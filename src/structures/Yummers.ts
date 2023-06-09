import * as fs from 'fs';
import * as path from 'path';

import { GuildUser, Prisma, PrismaClient, Guild as PrismaGuild } from '@prisma/client';
import {
    ActivityType,
    Client,
    Collection,
    ColorResolvable,
    GatewayIntentBits,
    Guild,
    GuildMember,
    NewsChannel,
    Role,
    TextChannel
} from 'discord.js';
import { DateTime, Duration } from 'luxon';
import { createOffsetDate } from '../util';
import Command from './Command';
import Logger from './Logger';

interface SimplifiedGuild {
    id: string;
    birthday_channel_id: string;
    birthday_role_id: string;
    birthday_message: string;
}

interface ExpandedGuildUser extends GuildUser {
    guild_id: string;
    user_id: string;
    guild: SimplifiedGuild;
    user: {
        id: string;
        birthday_utc: string;
        birthday_utc_offset: number;
        leap_year: boolean;
    };
}

type GuildUserMap = Map<string, string[]>;
type GuildMap = Map<string, SimplifiedGuild>;

class Yummers extends Client {
    commands: Collection<string, Command>;
    prisma: PrismaClient;
    embedColour: ColorResolvable;
    currentBirthdays: Map<string, Map<string, number>>;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.DirectMessageReactions,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.MessageContent
            ],
            presence: {
                status: 'online',
                activities: [
                    {
                        name: 'for birthdays 🎂',
                        type: ActivityType.Watching
                    }
                ]
            }
        });

        this.commands = new Collection();
        this.prisma = new PrismaClient();
        this.embedColour = process.env.EMBED_COLOUR as ColorResolvable;
        this.currentBirthdays = new Map();
    }

    async loadEvents(): Promise<void> {
        const eventPath = path.join(__dirname, '..', 'events');
        Logger.info(`Looking for events in ${eventPath}`);

        const names = fs.readdirSync(eventPath);
        const files = names.filter((name) => fs.statSync(path.join(eventPath, name)).isFile());

        let counter = 0;
        for (const file of files) {
            try {
                // interface EventImport {
                //     default: typeof Event;
                // }
                // This does not work because Event is an abstract class
                // What would work is if we could tell typescript that default is a constructor of a concrete class that inherits from Event which is abstract.

                const exportObj = await import(path.join(eventPath, file));

                const event = new exportObj.default(this);

                this[event.once ? 'once' : 'on'](event.name, (...args) => event.run(...args));

                counter++;
            } catch (err) {
                Logger.err(`Failed to import event ${file}`);
                Logger.err(err as Error);
            }
        }

        Logger.info(`Loaded ${counter} events`);
    }

    async loadCommands(): Promise<void> {
        const cmdPath = path.join(__dirname, '..', 'commands');
        Logger.info(`Looking for commands in ${cmdPath}`);

        const names = fs.readdirSync(cmdPath);
        const files = names.filter((name) => fs.statSync(path.join(cmdPath, name)).isFile());

        let counter = 0;
        for (const file of files) {
            try {
                const exportObj = await import(path.join(cmdPath, file));
                const command: Command = new exportObj.default(this);

                this.commands.set(command.builder.name, command);
                counter++;
            } catch (err) {
                Logger.err(`Failed to import command ${file}`);
                Logger.err(err as Error);
            }
        }

        Logger.info(`Loaded ${counter} events`);
    }

    private async celebrateUserBirthday(
        sGuild: SimplifiedGuild,
        guild: Guild,
        role: Role,
        channel: TextChannel | NewsChannel,
        userId: string
    ) {
        Logger.info(`Handling user ${this.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}`);

        const guildMap = this.currentBirthdays.get(guild.id) as Map<string, number>;

        if (guildMap.has(userId)) {
            Logger.warn(
                `User ${this.users.cache.get(userId)?.tag ?? userId} in guild ${
                    guild.name
                } already has an entry in client.currentBirthdays.get(${guild.id}) set. Skipping...`
            );
            return;
        }

        let member: GuildMember | null = null;
        try {
            member = await guild.members.fetch(userId);
        } catch (err) {
            Logger.warn(
                `Couldn't get member ${this.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}. Skipping...`
            );
            return;
        }
        if (!member) return;

        guildMap.set(userId, Date.now() + 24 * 60 * 60 * 1000);

        try {
            await channel.send({
                content: sGuild.birthday_message.replace('{user}', `<@${userId}>`)
            });

            Logger.info(`Sent birthday message for user ${member.user.tag} in guild ${guild.name}`);
        } catch (err) {
            Logger.err(`Couldn't send birthday message for user ${member.user.tag} in guild ${guild.name}`);
            Logger.err(err as Error);
        }

        try {
            await member.roles.add(role);

            Logger.info(`Added birthday role to user ${member.user.tag} in guild ${guild.name}`);
        } catch (err) {
            Logger.err(`Couldn't assign birthday role for user ${member.user.tag} in guild ${guild.name}`);
            Logger.err(err as Error);
        }
    }

    private async endUserBirthday(guild: Guild, role: Role, userId: string) {
        Logger.info(`Ending birthday for user ${this.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}`);

        const guildMap = this.currentBirthdays.get(guild.id) as Map<string, number>;

        let member: GuildMember | null = null;
        try {
            member = await guild.members.fetch(userId);
        } catch (err) {
            guildMap.delete(userId);
            Logger.err(
                `Couldn't get member ${this.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}. Skipping...`
            );
            Logger.err(err as Error);
            return;
        }
        if (!member) return;

        try {
            await member.roles.remove(role);
            guildMap.delete(userId);

            Logger.info(`Removed birthday role from user ${member.user.tag} in guild ${guild.name}`);
        } catch (err) {
            Logger.err(`Couldn't remove birthday role from user ${member.user.tag} in guild ${guild.name}`);
            Logger.err(err as Error);
        }
    }

    private async handleNewGuildBirthdays(
        sGuild: SimplifiedGuild,
        userIds: string[]
    ): Promise<PromiseSettledResult<void>[]> {
        Logger.info(`Handling guild ${sGuild.id}`);

        let guild: Guild | null = null;
        let birthdayChannel: TextChannel | NewsChannel | null = null;
        let birthdayRole: Role | null = null;

        try {
            guild = await this.guilds.fetch(sGuild.id);
        } catch (err) {
            Logger.err(`Couldn't get guild ${sGuild.id}. Skipping...`);
            Logger.err(err as Error);

            this.currentBirthdays.delete(sGuild.id);

            return [];
        }

        try {
            birthdayChannel = (await guild.channels.fetch(sGuild.birthday_channel_id as string)) as
                | TextChannel
                | NewsChannel;
        } catch (err) {
            Logger.err(`Couldn't get birthday channel for guild ${guild.name}. Skipping...`);
            Logger.err(err as Error);
            return [];
        }

        try {
            birthdayRole = await guild.roles.fetch(sGuild.birthday_role_id as string);
        } catch (err) {
            Logger.err(`Couldn't get birthday role for guild ${guild.name}. Skipping...`);
            Logger.err(err as Error);
            return [];
        }

        if (!birthdayChannel || !birthdayRole) {
            Logger.warn('Birthday channel or role does not exist. Skipping...');
            return [];
        }

        if (!this.currentBirthdays.has(guild.id)) {
            this.currentBirthdays.set(guild.id, new Map());
        }

        const promises = [];
        for (const userId of userIds) {
            promises.push(this.celebrateUserBirthday(sGuild, guild, birthdayRole, birthdayChannel, userId));
        }

        return Promise.allSettled(promises);
    }

    private async fetchNewBirthdays(
        startWindow: DateTime,
        endWindow: DateTime,
        userId: string | null,
        guildId: string | null
    ): Promise<ExpandedGuildUser[]> {
        const startWindowString = startWindow.toFormat('LLddHHmm');
        const endWindowString = endWindow.toFormat('LLddHHmm');

        const query: Prisma.GuildUserFindManyArgs = {
            where: {
                guild: {
                    birthdays_enabled: true,
                    birthday_channel_id: {
                        not: null
                    },
                    birthday_role_id: {
                        not: null
                    }
                },
                user: undefined
            },
            select: {
                guild: {
                    select: {
                        id: true,
                        birthday_channel_id: true,
                        birthday_role_id: true,
                        birthday_message: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        birthday_utc: true,
                        birthday_utc_offset: true,
                        leap_year: true
                    }
                }
            }
        };

        if (guildId) ((query.where as Prisma.GuildUserWhereInput).guild as Prisma.GuildWhereInput).id = guildId;

        // We assume that the max interval is one day.
        // This means if the window crosses years, then the start must be the same day as the last day of the previous year and the end must be the same day as the first day of the next (current) year.
        if (startWindow.year !== endWindow.year) {
            const prevYearEndString = startWindow.endOf('year').toFormat('LLddHHmm');
            const curYearStartString = endWindow.startOf('year').toFormat('LLddHHmm');

            const conditions: Prisma.UserWhereInput = {
                OR: [
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
                ]
            };

            if (userId) {
                // conditions.OR[0].AND.push({ id: userId });
                // This is truly a TypeScript moment
                (
                    ((conditions.OR as Prisma.UserWhereInput[])[0] as Prisma.UserWhereInput)
                        .AND as Prisma.UserWhereInput[]
                ).push({
                    id: userId
                });
                (
                    ((conditions.OR as Prisma.UserWhereInput[])[1] as Prisma.UserWhereInput)
                        .AND as Prisma.UserWhereInput[]
                ).push({
                    id: userId
                });
            }

            (query.where as Prisma.GuildUserWhereInput).user = conditions;
        } else {
            const conditions: Prisma.UserWhereInput = {
                AND: [
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
            };

            if (userId) (conditions.AND as Prisma.UserWhereInput[]).push({ id: userId });

            (query.where as Prisma.GuildUserWhereInput).user = conditions;
        }

        const expanded = await (this.prisma.guildUser.findMany(query) as Promise<ExpandedGuildUser[]>);

        return expanded.filter(({ user, guild_id }) => {
            /*
            We need to check if the user is already in the currentBirthdays map because of the following scenario:
            
            The user's birthday is within the last 5 minutes of a scan window. In this context, last means it's the 5 closest minutes to the endWindow.
            This means the birthday may be picked up by 2 scanNewBirthdays in a row. We scan the previous 20 minutes every 15 minutes to cover for any latency issues.
            So in this case, the user's birthday will double trigger unless we check if the user is already in the currentBirthdays map.
            A side effect of this is that we must scan for new birthdays first and THEN remove old birthdays!
            */
            const inCurrentBirthdays = this.currentBirthdays.get(guild_id)?.has(user.id);
            const cond = inCurrentBirthdays === undefined || inCurrentBirthdays === false ? true : false;

            return (
                // Filter out Feb 29ths if it is not a leap year
                createOffsetDate(user, user.birthday_utc < startWindowString ? endWindow.year : startWindow.year)
                    .isValid && cond
            );
        });
    }

    async scanExpiredBirthdays() {
        Logger.info('\nScanning old birthdays...');

        const scanGuilds = async (guildId: string, userMap: Map<string, number>) => {
            Logger.info(`Handling guild ${guildId}`);

            let guild: Guild | null = null;
            let sGuild: PrismaGuild | null = null;
            let birthdayRole: Role | null = null;

            try {
                guild = await this.guilds.fetch(guildId);
            } catch (err) {
                Logger.err(`Couldn't get guild ${guildId}. Skipping...`);
                Logger.err(err as Error);

                this.currentBirthdays.delete(guildId);

                return;
            }

            try {
                sGuild = await this.prisma.guild.findUnique({
                    where: {
                        id: guildId
                    }
                });
            } catch (err) {
                Logger.err(`Couldn't get birthday role ID for guild ${guild.name}. Skipping...`);
                Logger.err(err as Error);
                return;
            }

            if (!sGuild || !sGuild.birthday_role_id || !sGuild.birthdays_enabled) {
                Logger.warn(`Guild does not exist in database/empty role ID/birthdays not enabled. Skipping...`);
                return;
            }

            try {
                birthdayRole = await guild.roles.fetch(sGuild.birthday_role_id as string);
            } catch (err) {
                Logger.err(`Couldn't get birthday role for guild ${guild.name}. Skipping...`);
                Logger.err(err as Error);
                return;
            }

            if (!birthdayRole) {
                Logger.warn(`Birthday role does not exist. Skipping...`);
                return;
            }

            const promises = [];

            for (const [userId, birthdayEnd] of userMap) {
                if (birthdayEnd <= Date.now()) promises.push(this.endUserBirthday(guild, birthdayRole, userId));
            }

            return Promise.allSettled(promises);
        };

        const promises = [];
        for (const [guildId, userMap] of this.currentBirthdays) {
            promises.push(scanGuilds(guildId, userMap));
        }

        try {
            await Promise.allSettled(promises);
        } catch (err) {
            Logger.err('Failed to handle old birthdays');
            Logger.err(err as Error);
        }

        Logger.info('Finished handling old birthdays');
    }

    async scanNewBirthdays(
        interval: number,
        utcNow: DateTime | null = null,
        userId: string | null = null,
        guildId: string | null = null
    ) {
        Logger.info('\nScanning new birthdays...');

        if (!utcNow) utcNow = DateTime.utc();
        const startWindow = utcNow.minus(Duration.fromObject({ milliseconds: interval + 5000 }));
        const endWindow = utcNow;

        Logger.info(`UTC now: ${utcNow.toFormat('LLLL dd HH:mm')}`);
        Logger.info(`Start window: ${startWindow.toFormat('LLLL dd HH:mm')}`);
        Logger.info(`End window: ${endWindow.toFormat('LLLL dd HH:mm')}`);
        Logger.info(
            `Next refresh at ${endWindow
                .plus(Duration.fromObject({ milliseconds: interval }))
                .toFormat('LLLL dd HH:mm')}`
        );

        let guildUsers: ExpandedGuildUser[] = [];

        try {
            guildUsers = await this.fetchNewBirthdays(startWindow, endWindow, userId, guildId);
        } catch (err) {
            Logger.err(`Failed to retrieve eligible guild/user relationships from the database`);
            Logger.err(`userId: ${userId}, guildId: ${guildId}`);
            Logger.err(err as Error);
            return;
        }

        Logger.info(`Retrieved ${guildUsers.length} eligible guild/user relationships from the database`);

        if (guildUsers.length === 0) {
            return;
        }

        const guildUserMap: GuildUserMap = new Map();
        const guildMap: GuildMap = new Map();

        for (const gUser of guildUsers) {
            if (!guildUserMap.has(gUser.guild.id)) {
                guildUserMap.set(gUser.guild.id, []);
                guildMap.set(gUser.guild.id, gUser.guild);
            }

            (guildUserMap.get(gUser.guild.id) as string[]).push(gUser.user.id);
        }

        const promises = [];
        for (const [gId, userIds] of guildUserMap) {
            promises.push(this.handleNewGuildBirthdays(guildMap.get(gId) as SimplifiedGuild, userIds));
        }

        try {
            await Promise.allSettled(promises);
        } catch (err) {
            Logger.err('Failed to handle new birthdays');
            Logger.err(err as Error);
        }

        Logger.info('Finished handling new birthdays');
    }
}

export default Yummers;
