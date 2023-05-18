import BirthdayClient from '../structures/BirthdayClient';
import Command from '../structures/Command';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getEmbed } from '../util/EmbedHelper';

export default class Ping extends Command {
    constructor(client: BirthdayClient) {
        super({
            client: client,
            builder: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!')
        });
    }

    async run(interaction: ChatInputCommandInteraction): Promise<void> {
        const sent = await interaction.reply({
            embeds: [getEmbed().setDescription('Pinging...')],
            fetchReply: true
        });

        interaction.editReply({
            embeds: [
                getEmbed()
                    .setTitle('Pong!')
                    .setDescription(
                        `Roundtrip latency: \`${sent.createdTimestamp - interaction.createdTimestamp} ms\`\n` +
                            `Websocket heartbeat: \`${this.client.ws.ping} ms\``
                    )
            ]
        });
    }
}
