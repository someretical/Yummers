import { Events, PermissionsBitField, OAuth2Scopes } from 'discord.js';
import Event from '../structures/Event';
import BirthdayClient from '../structures/BirthdayClient';

export default class ClientReady extends Event {
    constructor(client: BirthdayClient) {
        super({
            client: client,
            name: Events.ClientReady,
            once: true
        });
    }

    async run(): Promise<void> {
        console.log(`Logged in as ${this.client.user?.tag}`);
        console.log(
            this.client.generateInvite({
                scopes: [OAuth2Scopes.ApplicationsCommands, OAuth2Scopes.Bot],
                permissions: PermissionsBitField.Default
            })
        );
    }
}
