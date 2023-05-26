import { Events, OAuth2Scopes, PermissionsBitField } from 'discord.js';
import Event from '../structures/Event';
import Logger from '../structures/Logger';
import Yummers from '../structures/Yummers';

export default class ClientReady extends Event {
    constructor(client: Yummers) {
        super({
            client: client,
            name: Events.ClientReady,
            once: true
        });
    }

    async run() {
        Logger.info(`Logged in as ${this.client.user?.tag}`);
        const invite = this.client.generateInvite({
            scopes: [OAuth2Scopes.ApplicationsCommands, OAuth2Scopes.Bot],
            permissions: PermissionsBitField.Default | PermissionsBitField.Flags.ManageRoles
        });
        Logger.info(`Invite link: ${invite}`);

        const interval = 15 * 60 * 1000;

        await this.client.scanNewBirthdays(interval);
        setInterval(async () => {
            await this.client.scanExpiredBirthdays();
            await this.client.scanNewBirthdays(interval);
        }, interval);
    }
}
