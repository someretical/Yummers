import { Events, Guild } from 'discord.js';
import Event from '../structures/Event';
import Logger from '../structures/Logger';
import Yummers from '../structures/Yummers';

export default class GuildCreate extends Event {
    constructor(client: Yummers) {
        super({
            client: client,
            name: Events.GuildCreate,
            once: false
        });
    }

    async run(guild: Guild): Promise<void> {
        /*
        There is a subtle bug here. If the a record for a guild is not created in the database and users set their birthdays in that guild, the relevant GuildUser records will also not be created. This is because a GuildUser record requires both an existing User AND Guild record. This "failure" is silent and will mean that the upcoming birthdays list will be blank for that guild.

        Although with this added event listener, this bug should now *rarely* trigger
        */
        Logger.info(`Joined guild ${guild.name} (${guild.id})`);

        try {
            await this.client.prisma.guild.upsert({
                where: {
                    id: guild.id
                },
                update: {},
                create: {
                    id: guild.id
                }
            });
        } catch (err) {
            Logger.err(`Failed to add guild to database`);
            Logger.err(err as Error);
        }
    }
}
