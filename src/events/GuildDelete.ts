import { Events, Guild } from 'discord.js';
import Event from '../structures/Event';
import Logger from '../structures/Logger';
import Yummers from '../structures/Yummers';

export default class GuildDelete extends Event {
    constructor(client: Yummers) {
        super({
            client: client,
            name: Events.GuildDelete,
            once: false
        });
    }

    async run(guild: Guild): Promise<void> {
        Logger.info(`Left guild ${guild.name} (${guild.id})`);

        try {
            await this.client.prisma.guild.delete({
                where: {
                    id: guild.id
                }
            });
        } catch (err) {
            Logger.err(`Failed to delete guild from database`);
            Logger.err(err as Error);
        }
    }
}
