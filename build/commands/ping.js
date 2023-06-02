"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const Command_1 = __importDefault(require("../structures/Command"));
const util_1 = require("../util");
class Ping extends Command_1.default {
    constructor(client) {
        super({
            client: client,
            builder: new discord_js_1.SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
            throttling: {
                usages: 1,
                duration: 5000
            }
        });
    }
    async run(interaction) {
        const sent = await interaction.reply({
            embeds: [(0, util_1.getEmbed)().setDescription('Pinging...')],
            fetchReply: true
        });
        interaction.editReply({
            embeds: [
                (0, util_1.getEmbed)()
                    .setTitle('Pong!')
                    .setDescription(`Roundtrip latency: \`${sent.createdTimestamp - interaction.createdTimestamp} ms\`\n` +
                    `Websocket heartbeat: \`${this.client.ws.ping} ms\``)
            ]
        });
    }
}
exports.default = Ping;
