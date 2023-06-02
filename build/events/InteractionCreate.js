"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const luxon_1 = require("luxon");
const Event_1 = __importDefault(require("../structures/Event"));
const Logger_1 = __importDefault(require("../structures/Logger"));
const util_1 = require("../util");
class InteractionCreate extends Event_1.default {
    constructor(client) {
        super({
            client: client,
            name: discord_js_1.Events.InteractionCreate,
            once: false
        });
    }
    async run(interaction) {
        if (!interaction.isChatInputCommand())
            return;
        const command = this.client.commands.get(interaction.commandName);
        if (!command)
            return;
        if (!command.throttler.check({ userId: interaction.user.id, guildId: interaction.guildId })) {
            const timeLeft = luxon_1.Duration.fromMillis(command.throttler.getTimeRemaining()).toFormat("hh'h' mm'm' ss's' SSS'ms'");
            await interaction.reply({
                embeds: [(0, util_1.getEmbed)().setDescription(`You are being rate limited! Try again in ${timeLeft}.`)],
                ephemeral: true
            });
            return;
        }
        try {
            await command.run(interaction);
        }
        catch (err) {
            Logger_1.default.err(`Failed to run command ${command.builder.name} in ${interaction.guild?.name || 'DMs'} from ${interaction.user.tag}`);
            Logger_1.default.err(err);
            const payload = {
                embeds: [(0, util_1.getEmbed)().setDescription('There was an error while executing this command!')],
                ephemeral: true
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload);
            }
            else {
                await interaction.reply(payload);
            }
        }
    }
}
exports.default = InteractionCreate;
