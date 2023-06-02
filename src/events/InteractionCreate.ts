import { Events, Interaction, InteractionReplyOptions } from 'discord.js';
import { Duration } from 'luxon';
import Event from '../structures/Event';
import Logger from '../structures/Logger';
import Yummers from '../structures/Yummers';
import { getEmbed } from '../util';

export default class InteractionCreate extends Event {
    constructor(client: Yummers) {
        super({
            client: client,
            name: Events.InteractionCreate,
            once: false
        });
    }

    async run(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) return;

        const command = this.client.commands.get(interaction.commandName);

        if (!command) return;

        if (!command.throttler.check({ userId: interaction.user.id, guildId: interaction.guildId })) {
            const timeLeft = Duration.fromMillis(command.throttler.getTimeRemaining()).toFormat(
                "hh'h' mm'm' ss's' SSS'ms'"
            );
            await interaction.reply({
                embeds: [getEmbed().setDescription(`You are being rate limited! Try again in ${timeLeft}.`)],
                ephemeral: true
            });

            return;
        }

        try {
            await command.run(interaction);
        } catch (err) {
            Logger.err(
                `Failed to run command ${command.builder.name} in ${interaction.guild?.name || 'DMs'} from ${
                    interaction.user.tag
                }`
            );
            Logger.err(err as Error);

            const payload: InteractionReplyOptions = {
                embeds: [getEmbed().setDescription('There was an error while executing this command!')],
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload);
            } else {
                await interaction.reply(payload);
            }
        }
    }
}
