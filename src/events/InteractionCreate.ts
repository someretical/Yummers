import { Events, Interaction } from 'discord.js';
import Yummers from '../structures/Yummers';
import Event from '../structures/Event';

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

        try {
            await command.run(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                });
            }
        }
    }
}
