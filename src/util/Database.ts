import { ChatInputCommandInteraction } from 'discord.js';
import { getEmbed } from './EmbedHelper';

export enum DatabaseErrorType {
    Read = 'reading',
    Write = 'writing'
}

export async function databaseError(
    err: any,
    type: DatabaseErrorType,
    interaction: ChatInputCommandInteraction
): Promise<void> {
    console.log(err);

    await interaction.reply({
        embeds: [getEmbed().setTitle('Database Error').setDescription(`There was an error while ${type} the database!`)]
    });
}
