"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const Event_1 = __importDefault(require("../structures/Event"));
const Logger_1 = __importDefault(require("../structures/Logger"));
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
        try {
            await command.run(interaction);
        }
        catch (err) {
            Logger_1.default.err(`Failed to run command ${command.builder.name} in ${interaction.guild?.name || 'DMs'} from ${interaction.user.tag}`);
            Logger_1.default.err(err);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                });
            }
            else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                });
            }
        }
    }
}
exports.default = InteractionCreate;
