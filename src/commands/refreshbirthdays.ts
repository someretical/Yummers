import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { DateTime } from 'luxon';
import BirthdayClient from '../structures/BirthdayClient';
import Command from '../structures/Command';
import { refreshBirthdays } from '../util/Birthday';
import { getEmbed } from '../util/EmbedHelper';

export default class RefreshBirthdays extends Command {
    constructor(client: BirthdayClient) {
        super({
            client: client,
            builder: new SlashCommandBuilder().setName('refreshbirthdays').setDescription('Refresh birthdays!')
        });
    }

    async run(interaction: ChatInputCommandInteraction): Promise<void> {
        if (interaction.user.id !== process.env.OWNER_ID) {
            await interaction.reply({
                embeds: [getEmbed().setDescription('You are not the owner of this bot!')]
            });
        }

        refreshBirthdays(this.client, 24 * 60 * 60 * 1000, DateTime.utc());

        await interaction.reply({
            embeds: [getEmbed().setDescription('Refreshing...')]
        });
    }
}
