"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const Event_1 = __importDefault(require("../structures/Event"));
const Logger_1 = __importDefault(require("../structures/Logger"));
class ClientReady extends Event_1.default {
    constructor(client) {
        super({
            client: client,
            name: discord_js_1.Events.ClientReady,
            once: true
        });
    }
    async run() {
        Logger_1.default.info(`Logged in as ${this.client.user?.tag}`);
        const invite = this.client.generateInvite({
            scopes: [discord_js_1.OAuth2Scopes.ApplicationsCommands, discord_js_1.OAuth2Scopes.Bot],
            permissions: discord_js_1.PermissionsBitField.Default | discord_js_1.PermissionsBitField.Flags.ManageRoles
        });
        Logger_1.default.info(`Invite link: ${invite}`);
        const interval = 15 * 60 * 1000;
        await this.client.scanNewBirthdays(interval);
        setInterval(async () => {
            // The ordering here is extremely important. See the end of fetchNewBirthdays in Yummers.ts for more information.
            await this.client.scanNewBirthdays(interval);
            await this.client.scanExpiredBirthdays();
        }, interval);
    }
}
exports.default = ClientReady;
