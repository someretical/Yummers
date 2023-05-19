import { Guild as PrismaGuild, User as PrismaUser } from '@prisma/client';
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
            } already has birthday role set!`
        );
        return;
    }

    let member: GuildMember | null = null;
    try {
        member = await guild.members.fetch(userId);
    } catch (err) {
        console.log(`Couldn't get member ${client.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}!`);
        return;
    }
    if (!member) return;

    try {
        await channel.send({
            content: pGuild.birthday_message.replace('{user}', `<@${userId}>`)
        });
        await member.roles.add(role);
        guildMap.set(userId, Date.now() + 24 * 60 * 60 * 1000);

        console.log(`Added birthday role to user ${member.user.tag} in guild ${guild.name} + sent message!`);
    } catch (err) {
        console.log(
            `Couldn't send birthday message for user ${member.user.tag} in guild ${guild.name} OR assign role!`
        );
    }
}

async function endUserBirthday(client: BirthdayClient, guild: Guild, role: Role, userId: string) {
    console.log(`Ending birthday for user ${client.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}`);

    const guildMap = client.currentBirthdays.get(guild.id) as Map<string, number>;

    let member: GuildMember | null = null;
    try {
        member = await guild.members.fetch(userId);
    } catch (err) {
        console.log(`Couldn't get member ${client.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}!`);
        guildMap.delete(userId);
        return;
    }
    if (!member) return;

    try {
        await member.roles.remove(role);
        guildMap.delete(userId);

        console.log(`Removed birthday role from user ${member.user.tag} in guild ${guild.name}!`);
    } catch (err) {
        console.log(`Couldn't remove birthday role from user ${member.user.tag} in guild ${guild.name}!`);
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
        console.log(`Couldn't get guild ${pGuild.id}!`);
        return [];
    }

    try {
        birthdayChannel = (await guild.channels.fetch(pGuild.birthday_channel_id as string)) as
            | TextChannel
            | NewsChannel;
        birthdayRole = await guild.roles.fetch(pGuild.birthday_role_id as string);
    } catch (err) {
        console.log(`Couldn't get birthday channel or role for guild ${guild.name}!`);
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

export async function refreshBirthdays(
    client: BirthdayClient,
    interval: number,
    utcNow: DateTime | null
): Promise<void> {
    console.log('\nRefreshing birthdays...');

    /*
    Assuming the user's birthday is the 5th Jan UTC+10:00.
    This means they experience their birthday on the 5th Jan at 12:00 AM and their region is 10 hours ahead of UTC.
    The bot will have to celebrate their birthday at 14:00 UTC+00:00 on the 4th Jan.
    The role will have to be removed at 14:00 UTC+00:00 on the 5th Jan.

    Taken to the extreme, if the user's birthday is the 5th Jan UTC+11:59.
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

    /////////////////////////////
    let birthday = DateTime.fromObject(
        {
            year: 2000,
            month: userData.birthday_start_month,
            day: userData.birthday_start_day,
            hour: userData.birthday_start_hour,
            minute: userData.birthday_start_minute
        },
        { zone: offset }
    );
    birthday = birthday.plus({ minutes: offset.offset(0) });
    /////////////////////////////

    From this point forwards, the bot only deals with UTC dates to prevent confusion.

    To find users who need a birthday role added:
    Set the start of the scan window to be the last time the bot checked for birthdays.
    Set the end of the scan window to be utcNow
    Scan for users between that window

    There is no concise way to construct such a query so an approximation is used:

    Grab all users whose birthdays are between the start and end of the window. We do not consider the time. 

    Afterwards, we can use luxon to compare the times.
    */

    if (!utcNow) utcNow = DateTime.utc();
    const startWindow = utcNow.minus(Duration.fromObject({ milliseconds: interval + 1000 }));
    const endWindow = utcNow;

    console.log(`UTC now: ${utcNow.toFormat('LLLL dd HH:mm')}`);
    console.log(`Start window: ${startWindow.toFormat('LLLL dd HH:mm')}`);
    console.log(`End window: ${endWindow.toFormat('LLLL dd HH:mm')}`);

    let pUsers: PrismaUser[] = [];
    let pGuilds: PrismaGuild[] = [];

    try {
        if (startWindow.day !== endWindow.day) {
            pUsers = await client.prisma.user.findMany({
                where: {
                    OR: [
                        {
                            AND: [
                                {
                                    birthday_start_day: startWindow.day
                                },
                                {
                                    birthday_start_month: startWindow.month
                                }
                            ]
                        },
                        {
                            AND: [
                                {
                                    birthday_start_day: endWindow.day
                                },
                                {
                                    birthday_start_month: endWindow.month
                                }
                            ]
                        }
                    ]
                }
            });
        } else {
            pUsers = await client.prisma.user.findMany({
                where: {
                    AND: [
                        {
                            birthday_start_day: startWindow.day
                        },
                        {
                            birthday_start_month: startWindow.month
                        }
                    ]
                }
            });
        }

        pUsers = pUsers.filter((pUser) => {
            const birthday = DateTime.fromObject(
                {
                    year:
                        startWindow.year === endWindow.year
                            ? startWindow.year
                            : startWindow.month === pUser.birthday_start_month ||
                              startWindow.day === pUser.birthday_start_day
                            ? startWindow.year
                            : endWindow.year,
                    month: pUser.birthday_start_month,
                    day: pUser.birthday_start_day,
                    hour: pUser.birthday_start_hour,
                    minute: pUser.birthday_start_minute
                },
                { zone: 'utc' }
            );
            return birthday >= startWindow && birthday <= endWindow;
        });

        pGuilds = await client.prisma.guild.findMany({
            where: {
                birthdays_enabled: true,
                birthday_channel_id: {
                    not: null
                },
                birthday_role_id: {
                    not: null
                }
            }
        });
    } catch (err) {
        console.log(err);
    }

    console.log(`Retrieved ${pUsers.length} users from the database!`);
    console.log(`Retrieved ${pGuilds.length} guilds from the database!`);

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

    console.log('Finished refreshing birthdays!');
}
