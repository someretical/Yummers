import { GuildUser, Prisma } from '@prisma/client';
import { Guild, GuildMember, NewsChannel, Role, TextChannel } from 'discord.js';
import { DateTime, Duration, FixedOffsetZone } from 'luxon';
import BirthdayClient from '../structures/BirthdayClient';

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
    };
}

type GuildUserMap = Map<string, string[]>;
type GuildMap = Map<string, SimplifiedGuild>;

export function stringToBirthday(dateString: string, offset: number, year = 2000): DateTime {
    const zone = FixedOffsetZone.instance(offset);

    const birthday = DateTime.fromObject(
        {
            year: year,
            month: parseInt(dateString.substring(0, 2)),
            day: parseInt(dateString.substring(2, 4)),
            hour: parseInt(dateString.substring(4, 6)),
            minute: parseInt(dateString.substring(6))
        },
        { zone: zone }
    ).plus({ minutes: zone.offset(0) });

    return birthday;
}

async function celebrateUserBirthday(
    client: BirthdayClient,
    sGuild: SimplifiedGuild,
    guild: Guild,
    role: Role,
    channel: TextChannel | NewsChannel,
    userId: string
) {
    console.log(`Handling user ${client.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}`);

    const guildMap = client.currentBirthdays.get(guild.id) as Map<string, number>;

    if (guildMap.has(userId)) {
        console.log(
            `User ${client.users.cache.get(userId)?.tag ?? userId} in guild ${
                guild.name
            } already has an entry in client.currentBirthdays.get(${guild.id}) set. Skipping...`
        );
        return;
    }

    let member: GuildMember | null = null;
    try {
        member = await guild.members.fetch(userId);
    } catch (err) {
        console.log(
            `Couldn't get member ${client.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}. Skipping...`
        );
        return;
    }
    if (!member) return;

    guildMap.set(userId, Date.now() + 24 * 60 * 60 * 1000);

    try {
        await channel.send({
            content: sGuild.birthday_message.replace('{user}', `<@${userId}>`)
        });

        console.log(`Sent birthday message for user ${member.user.tag} in guild ${guild.name}`);
    } catch (err) {
        console.log(`Couldn't send birthday message for user ${member.user.tag} in guild ${guild.name}`);
    }

    try {
        await member.roles.add(role);

        console.log(`Added birthday role to user ${member.user.tag} in guild ${guild.name}`);
    } catch (err) {
        console.log(`Couldn't assign birthday role for user ${member.user.tag} in guild ${guild.name}`);
    }
}

async function endUserBirthday(client: BirthdayClient, guild: Guild, role: Role, userId: string) {
    console.log(`Ending birthday for user ${client.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}`);

    const guildMap = client.currentBirthdays.get(guild.id) as Map<string, number>;

    let member: GuildMember | null = null;
    try {
        member = await guild.members.fetch(userId);
    } catch (err) {
        console.log(
            `Couldn't get member ${client.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}. Skppping...`
        );
        guildMap.delete(userId);
        return;
    }
    if (!member) return;

    try {
        await member.roles.remove(role);
        guildMap.delete(userId);

        console.log(`Removed birthday role from user ${member.user.tag} in guild ${guild.name}`);
    } catch (err) {
        console.log(`Couldn't remove birthday role from user ${member.user.tag} in guild ${guild.name}`);
    }
}

async function handleGuildBirthdays(
    client: BirthdayClient,
    sGuild: SimplifiedGuild,
    userIds: string[]
): Promise<PromiseSettledResult<void>[]> {
    console.log(`Handling guild ${sGuild.id}`);

    let guild: Guild | null = null;
    let birthdayChannel: TextChannel | NewsChannel | null = null;
    let birthdayRole: Role | null = null;

    try {
        guild = await client.guilds.fetch(sGuild.id);
    } catch (err) {
        console.log(`Couldn't get guild ${sGuild.id}. Skipping...`);
        return [];
    }

    try {
        birthdayChannel = (await guild.channels.fetch(sGuild.birthday_channel_id as string)) as
            | TextChannel
            | NewsChannel;
    } catch (err) {
        console.log(`Couldn't get birthday channel for guild ${guild.name}. Skipping...`);
        return [];
    }

    try {
        birthdayRole = await guild.roles.fetch(sGuild.birthday_role_id as string);
    } catch (err) {
        console.log(`Couldn't get birthday role for guild ${guild.name}. Skipping...`);
        return [];
    }

    if (!birthdayChannel || !birthdayRole) return [];

    if (!client.currentBirthdays.has(guild.id)) {
        client.currentBirthdays.set(guild.id, new Map());
    }

    const promises = [];
    for (const userId of userIds) {
        promises.push(celebrateUserBirthday(client, sGuild, guild, birthdayRole, birthdayChannel, userId));
    }

    for (const [userId, birthdayEnd] of client.currentBirthdays.get(guild.id) as Map<string, number>) {
        if (birthdayEnd <= Date.now()) promises.push(endUserBirthday(client, guild, birthdayRole, userId));
    }

    return Promise.allSettled(promises);
}

export async function fetchUsers(
    client: BirthdayClient,
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
                    id: true
                }
            }
        }
    };

    if (guildId) (query.where!.guild as Prisma.GuildWhereInput).id = guildId;

    // We assume that the max interval is one day.
    // This means if the window crosses years, then the start must be the same day as the last day of the previous year and the end must be the same day as the first day of the next (crrrent) year.
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
            (
                ((conditions.OR as Prisma.UserWhereInput[])[0] as Prisma.UserWhereInput).AND as Prisma.UserWhereInput[]
            ).push({
                id: userId
            });
            (
                ((conditions.OR as Prisma.UserWhereInput[])[1] as Prisma.UserWhereInput).AND as Prisma.UserWhereInput[]
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

    return client.prisma.guildUser.findMany(query) as Promise<ExpandedGuildUser[]>;
}

export async function refreshBirthdays(
    client: BirthdayClient,
    interval: number,
    utcNow: DateTime | null = null,
    userId: string | null = null,
    guildId: string | null = null
): Promise<void> {
    console.log('\nRefreshing birthdays...');

    if (!utcNow) utcNow = DateTime.utc();
    const startWindow = utcNow.minus(Duration.fromObject({ milliseconds: interval + 5000 }));
    const endWindow = utcNow;

    console.log(`UTC now: ${utcNow.toFormat('LLLL dd HH:mm')}`);
    console.log(`Start window: ${startWindow.toFormat('LLLL dd HH:mm')}`);
    console.log(`End window: ${endWindow.toFormat('LLLL dd HH:mm')}`);
    console.log(
        `Next refresh at ${endWindow.plus(Duration.fromObject({ milliseconds: interval })).toFormat('LLLL dd HH:mm')}`
    );

    let relos: ExpandedGuildUser[] = [];

    try {
        relos = await fetchUsers(client, startWindow, endWindow, userId, guildId);
    } catch (err) {
        console.log(err);
    }

    console.log(`Retrieved ${relos.length} elegible guild/user relationships from the database`);

    if (relos.length === 0) {
        console.log('No users to refresh');
        return;
    }

    const guildUserMap: GuildUserMap = new Map();
    const guildMap: GuildMap = new Map();

    for (const relo of relos) {
        if (!guildUserMap.has(relo.guild.id)) {
            guildUserMap.set(relo.guild.id, []);
            guildMap.set(relo.guild.id, relo.guild);
        }

        guildUserMap.get(relo.guild.id)!.push(relo.user.id);
    }

    const promises = [];
    for (const [gId, userIds] of guildUserMap) {
        promises.push(handleGuildBirthdays(client, guildMap.get(gId)!, userIds));
    }

    try {
        await Promise.allSettled(promises);
    } catch (err) {
        console.log(err);
    }

    console.log('Finished refreshing birthdays');
}
