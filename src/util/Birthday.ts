import { Prisma, Guild as PrismaGuild, User as PrismaUser } from '@prisma/client';
import { Guild, GuildMember, NewsChannel, Role, TextChannel } from 'discord.js';
import { DateTime, Duration } from 'luxon';
import BirthdayClient from '../structures/BirthdayClient';

async function celebrateUserBirthday(
    client: BirthdayClient,
    pGuild: PrismaGuild,
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
            } already has birthday role set. Skipping...`
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
            content: pGuild.birthday_message.replace('{user}', `<@${userId}>`)
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
    pGuild: PrismaGuild,
    pUsers: PrismaUser[]
): Promise<PromiseSettledResult<void>[]> {
    console.log(`Handling guild ${pGuild.id}`);

    let guild: Guild | null = null;
    let birthdayChannel: TextChannel | NewsChannel | null = null;
    let birthdayRole: Role | null = null;

    try {
        guild = await client.guilds.fetch(pGuild.id);
    } catch (err) {
        console.log(`Couldn't get guild ${pGuild.id}. Skipping...`);
        return [];
    }

    try {
        birthdayChannel = (await guild.channels.fetch(pGuild.birthday_channel_id as string)) as
            | TextChannel
            | NewsChannel;
    } catch (err) {
        console.log(`Couldn't get birthday channel for guild ${guild.name}. Skipping...`);
        return [];
    }

    try {
        birthdayRole = await guild.roles.fetch(pGuild.birthday_role_id as string);
    } catch (err) {
        console.log(`Couldn't get birthday role for guild ${guild.name}. Skipping...`);
        return [];
    }

    if (!birthdayChannel || !birthdayRole) return [];

    if (!client.currentBirthdays.has(guild.id)) {
        client.currentBirthdays.set(guild.id, new Map());
    }

    const promises = [];
    for (const pUser of pUsers) {
        promises.push(celebrateUserBirthday(client, pGuild, guild, birthdayRole, birthdayChannel, pUser.id));
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
    userId: string | null
) {
    const startWindowString = startWindow.toFormat('LLddHHmm');
    const endWindowString = endWindow.toFormat('LLddHHmm');

    // We assume that the max interval is one day.
    // This means if the window crosses years, then the start must be the same day as the last day of the previous year and the end must be the same day as the first day of the next (crrrent) year.
    if (startWindow.year !== endWindow.year) {
        const prevYearEndString = startWindow.endOf('year').toFormat('LLddHHmm');
        const curYearStartString = endWindow.startOf('year').toFormat('LLddHHmm');

        const conditions: Prisma.UserFindManyArgs = {
            where: {
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
            }
        };

        if (userId) {
            (
                ((conditions.where?.OR as Prisma.UserWhereInput[])[0] as Prisma.UserWhereInput)
                    .AND as Prisma.UserWhereInput[]
            ).push({ id: userId });
            (
                ((conditions.where?.OR as Prisma.UserWhereInput[])[1] as Prisma.UserWhereInput)
                    .AND as Prisma.UserWhereInput[]
            ).push({ id: userId });
        }

        return client.prisma.user.findMany(conditions);
    } else {
        const conditions: Prisma.UserFindManyArgs = {
            where: {
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
            }
        };

        if (userId) (conditions.where?.AND as Prisma.UserWhereInput[]).push({ id: userId });

        return client.prisma.user.findMany(conditions);
    }
}

async function fetchGuilds(client: BirthdayClient, guildId: string | null) {
    const query: Prisma.GuildFindManyArgs = {
        where: {
            birthdays_enabled: true,
            birthday_channel_id: {
                not: null
            },
            birthday_role_id: {
                not: null
            }
        }
    };

    if (guildId) (query.where as Prisma.GuildWhereInput).id = guildId;

    return client.prisma.guild.findMany(query);
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

    let pUsers: PrismaUser[] = [];
    let pGuilds: PrismaGuild[] = [];

    try {
        pUsers = await fetchUsers(client, startWindow, endWindow, userId);
        pGuilds = await fetchGuilds(client, guildId);
    } catch (err) {
        console.log(err);
    }

    console.log(`Retrieved ${pUsers.length} users from the database`);
    console.log(`Retrieved ${pGuilds.length} guilds from the database`);

    if (pUsers.length !== 0) {
        const promises = [];
        for (const pGuild of pGuilds) {
            promises.push(handleGuildBirthdays(client, pGuild, pUsers));
        }

        try {
            await Promise.allSettled(promises);
        } catch (err) {
            console.log(err);
        }
    } else {
        console.log('No users to refresh');
    }

    console.log('Finished refreshing birthdays');
}
