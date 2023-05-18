import BirthdayClient from '../structures/BirthdayClient';
import Command from '../structures/Command';
import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default class Ping extends Command {
    constructor(client: BirthdayClient) {
        super({
            client: client,
            builder: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!')
        });
    }

    async run(interaction: CommandInteraction): Promise<void> {
        const sent = await interaction.reply({
            embeds: [new EmbedBuilder().setColor(this.client.embedColour).setDescription('Pinging...')],
            fetchReply: true
        });

        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(this.client.embedColour)
                    .setTitle('Pong!')
                    .setDescription(
                        `Roundtrip latency: \`${sent.createdTimestamp - interaction.createdTimestamp} ms\`\n` +
                            `Websocket heartbeat: \`${this.client.ws.ping} ms\``
                    )
            ]
        });
    }
}
