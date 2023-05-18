import { ChatInputCommandInteraction } from 'discord.js';
import { getEmbed } from './EmbedHelper';

export async function databaseError(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
        embeds: [
            getEmbed().setTitle('Database Error').setDescription('There was an error while updating the database!')
        ]
    });
}
