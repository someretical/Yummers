import { ColorResolvable, EmbedBuilder } from 'discord.js';

export function getEmbed(): EmbedBuilder {
    return new EmbedBuilder().setColor(process.env.EMBED_COLOUR as ColorResolvable);
}
