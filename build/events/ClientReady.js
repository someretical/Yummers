"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const Event_1 = __importDefault(require("../structures/Event"));
const Birthday_1 = require("../util/Birthday");
class ClientReady extends Event_1.default {
    constructor(client) {
        super({
            client: client,
            name: discord_js_1.Events.ClientReady,
            once: true
        });
    }
    async run() {
        console.log(`Logged in as ${this.client.user?.tag}`);
        console.log(this.client.generateInvite({
            scopes: [discord_js_1.OAuth2Scopes.ApplicationsCommands, discord_js_1.OAuth2Scopes.Bot],
            permissions: discord_js_1.PermissionsBitField.Default | discord_js_1.PermissionsBitField.Flags.ManageRoles
        }));
        const interval = 15 * 60 * 1000;
        await (0, Birthday_1.refreshBirthdays)(this.client, interval);
        setInterval(() => (0, Birthday_1.refreshBirthdays)(this.client, interval), interval);
    }
}
exports.default = ClientReady;
