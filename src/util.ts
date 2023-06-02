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

export function paginate<T>(array: Array<T>, pageSize: number, pageNumber: number) {
    return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
}
