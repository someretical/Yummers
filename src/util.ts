import { GuildUser } from '@prisma/client';
import { ChatInputCommandInteraction, ColorResolvable, EmbedBuilder } from 'discord.js';
import { DateTime, FixedOffsetZone } from 'luxon';
import Logger from './structures/Logger';

export enum DatabaseErrorType {
    Read = 'reading',
    Write = 'writing'
}

export async function databaseError(err: Error, type: DatabaseErrorType, interaction: ChatInputCommandInteraction) {
    Logger.err(`Database error`);
    Logger.err(err);

    await interaction.reply({
        embeds: [getEmbed().setTitle('Database Error').setDescription(`There was an error while ${type} the database!`)]
    });
}

export function getEmbed(): EmbedBuilder {
    return new EmbedBuilder().setColor(process.env.EMBED_COLOUR as ColorResolvable);
}

export interface GuildUserWithUser extends GuildUser {
    guild_id: string;
    user_id: string;
    user: {
        id: string;
        birthday_utc: string;
        birthday_utc_offset: number;
        leap_year: boolean;
    };
}

export function stringToBirthday(user: GuildUserWithUser['user'], year: number): DateTime {
    /*
    The reason why we need to first set the year to 2000 and THEN set it to the proper year is really broken.
    Let us say that the user's birthday is March 1st 2004 at 12:00 AM UTC+10:00. This means the birthday happened at 2PM UTC on February 29th 2004. This is version that is stored in the database.

    The validateUTCBirthday function below will return true if we pass in the year 2023. 
    adjusted will have the following properties:
    - year: 2004
    - month: 2
    - day: 29
    - hour: 14
    - minute: 0

    And then we add on the utc offset which is 600 because it is +10:00. This changes the date so now it is:
    - year: 2004
    - month: 3
    - day: 1
    - hour: 0
    - minute: 0

    Now we set the year to 2023. This changes the date to:
    - year: 2023
    - month: 3
    - day: 1
    - hour: 0
    - minute: 0
    which is valid.

    However if we do:
    DateTime.utc(
        year,
        parseInt(user.birthday_utc.substring(0, 2)),
        parseInt(user.birthday_utc.substring(2, 4)),
        parseInt(user.birthday_utc.substring(4, 6)),
        parseInt(user.birthday_utc.substring(6))
    )...
    below, then we end up with a date that is invalid because it has the following properties:
    - year: 2023
    - month: 2
    - day: 29
    - hour: 14
    - minute: 0

    This is why we have to first set the year to 2000 and then afterwards set it to the actual year we want. The set() function will properly "round" the date to the correct one that we want which is actually February 28th 2PM UTC or March 1st 12AM UTC+10:00.

    This is also why in the validateUTCBirthday function we cannot use the set() function to set the new year. We do NOT want the set function to round the date if it becomes invalid! This is why we construct a new date and directly check if it's invalid.
    */
    return DateTime.utc(
        2000,
        parseInt(user.birthday_utc.substring(0, 2)),
        parseInt(user.birthday_utc.substring(2, 4)),
        parseInt(user.birthday_utc.substring(4, 6)),
        parseInt(user.birthday_utc.substring(6))
    )
        .setZone(FixedOffsetZone.instance(user.birthday_utc_offset))
        .set({ year });
}

export function createOffsetDate(user: GuildUserWithUser['user'], year: number): DateTime {
    const adjusted = DateTime.utc(
        user.leap_year ? 2000 : 2001,
        parseInt(user.birthday_utc.substring(0, 2)),
        parseInt(user.birthday_utc.substring(2, 4)),
        parseInt(user.birthday_utc.substring(4, 6)),
        parseInt(user.birthday_utc.substring(6))
    ).plus({ minutes: user.birthday_utc_offset });

    return DateTime.utc(year, adjusted.month, adjusted.day, adjusted.hour, adjusted.minute);
}

export function paginate<T>(array: Array<T>, pageSize: number, pageNumber: number) {
    return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
}
