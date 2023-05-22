"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbed = void 0;
const discord_js_1 = require("discord.js");
function getEmbed() {
    return new discord_js_1.EmbedBuilder().setColor(process.env.EMBED_COLOUR);
}
exports.getEmbed = getEmbed;
