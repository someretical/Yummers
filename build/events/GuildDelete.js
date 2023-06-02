"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const Event_1 = __importDefault(require("../structures/Event"));
const Logger_1 = __importDefault(require("../structures/Logger"));
class GuildDelete extends Event_1.default {
    constructor(client) {
        super({
            client: client,
            name: discord_js_1.Events.GuildDelete,
            once: false
        });
    }
    async run(guild) {
        Logger_1.default.info(`Left guild ${guild.name} (${guild.id})`);
        try {
            await this.client.prisma.guild.delete({
                where: {
                    id: guild.id
                }
            });
        }
        catch (err) {
            Logger_1.default.err(`Failed to delete guild from database`);
            Logger_1.default.err(err);
        }
    }
}
exports.default = GuildDelete;
