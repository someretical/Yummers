"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const Event_1 = __importDefault(require("../structures/Event"));
const Logger_1 = __importDefault(require("../structures/Logger"));
class GuildCreate extends Event_1.default {
    constructor(client) {
        super({
            client: client,
            name: discord_js_1.Events.GuildCreate,
            once: false
        });
    }
    async run(guild) {
        /*
        There is a subtle bug here. If the a record for a guild is not created in the database and users set their birthdays in that guild, the relevant GuildUser records will also not be created. This is because a GuildUser record requires both an existing User AND Guild record. This "failure" is silent and will mean that the upcoming birthdays list will be blank for that guild.

        Although with this added event listener, this bug should now *rarely* trigger
        */
        Logger_1.default.info(`Joined guild ${guild.name} (${guild.id})`);
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
        }
        catch (err) {
            Logger_1.default.err(`Failed to add guild to database`);
            Logger_1.default.err(err);
        }
    }
}
exports.default = GuildCreate;
