import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import Command from '../structures/Command';
import Yummers from '../structures/Yummers';
import { getEmbed } from '../util';

export default class Ping extends Command {
    constructor(client: Yummers) {
        super({
            client: client,
            builder: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
            throttling: {
                usages: 1,
                duration: 5000
            }
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
