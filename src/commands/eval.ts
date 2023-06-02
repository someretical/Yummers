import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import util from 'util';
import Command from '../structures/Command';
import Yummers from '../structures/Yummers';
import { getEmbed } from '../util';

export default class Eval extends Command {
    public lastResult: any;
    public hrStart: [number, number];

    constructor(client: Yummers) {
        super({
            client: client,
            builder: new SlashCommandBuilder()
                .setName('eval')
                .setDescription('Evaluate JavaScript!')
                .addStringOption((option) =>
                    option.setName('code').setDescription('The code to evaluate').setRequired(true)
                ),
            throttling: {
                usages: 0,
                duration: 0
            }
        });

        this.lastResult = null;
        this.hrStart = [0, 0];
    }

    async run(interaction: ChatInputCommandInteraction): Promise<void> {
        if (interaction.user.id !== process.env.OWNER_ID) {
            await interaction.reply({
                embeds: [getEmbed().setDescription('You are not the owner of this bot!')]
            });

            return;
        }

        await interaction.deferReply();

        let hrDiff: [number, number];
        try {
            const hrStart = process.hrtime();

            this.lastResult = await eval(interaction.options.getString('code') as string);

            hrDiff = process.hrtime(hrStart);
        } catch (err) {
            await interaction.editReply({
                content: `\`\`\`\n${err}\n\`\`\``
            });
            return;
        }

        this.hrStart = process.hrtime();

        const result = this.makeResultMessages(
            this.lastResult,
            hrDiff,
            interaction.options.getString('code') as string
        );
        if (Array.isArray(result)) {
            interaction.editReply({ content: result.shift() });

            result.map(async (item) => {
                await interaction.followUp({ content: item });
            });
        } else {
            interaction.editReply({ content: result });
        }
    }

    splitMessage(text: string, { maxLength = 2000, char = '\n', prepend = '', append = '' } = {}) {
        if (text.length <= maxLength) return [text];
        let splitText = [text];
        if (Array.isArray(char)) {
            while (char.length > 0 && splitText.some((elem) => elem.length > maxLength)) {
                const currentChar = char.shift();
                if (currentChar instanceof RegExp) {
                    splitText = splitText.flatMap((chunk) => chunk.match(currentChar) ?? 'null');
                } else {
                    splitText = splitText.flatMap((chunk) => chunk.split(currentChar));
                }
            }
        } else {
            splitText = text.split(char);
        }
        if (splitText.some((elem) => elem.length > maxLength)) throw new RangeError('SPLIT_MAX_LEN');
        const messages = [];
        let msg = '';
        for (const chunk of splitText) {
            if (msg && (msg + char + chunk + append).length > maxLength) {
                messages.push(msg + append);
                msg = prepend;
            }
            msg += (msg && msg !== prepend ? char : '') + chunk;
        }
        return messages.concat(msg).filter((m) => m);
    }

    sanitise(result: string, regex = false) {
        const cleansed = result
            .toString()
            .replace(process.env.TOKEN as string, '[redacted]')
            .replace(process.env.DATABASE_URL as string, '[redacted]')
            .replace(/@(everyone|here)/g, '@\u200b$1');

        return !regex ? cleansed : cleansed.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
    }

    makeResultMessages(result: any, hrDiff: [number, number], input = '') {
        const inspected = this.sanitise(
            util.inspect(result, { depth: 2, breakLength: 120, compact: true }).replace(/!!NL!!/g, '\n')
        );
        const split = inspected.split('\n');
        const last = inspected.length - 1;
        const prependPart =
            inspected[0] !== '{' && inspected[0] !== '[' && inspected[0] !== "'" ? split[0] : inspected[0];
        const appendPart =
            inspected[last] !== '}' && inspected[last] !== ']' && inspected[last] !== "'"
                ? split[split.length - 1]
                : inspected[last];
        const prepend = `\`\`\`js\n${prependPart}\n`;
        const append = `\n${appendPart}\n\`\`\``;

        if (input.length) {
            return this.splitMessage(
                `*Executed in ${hrDiff[0] > 0 ? `${hrDiff[0]}s ` : ''}${hrDiff[1] / 1000000}ms.*
\`\`\`js
${inspected}
\`\`\``,
                { maxLength: 1900, prepend, append }
            );
        } else {
            return this.splitMessage(
                `*Callback executed after ${hrDiff[0] > 0 ? `${hrDiff[0]}s ` : ''}${hrDiff[1] / 1000000}ms.*
\`\`\`js
${inspected}
\`\`\``,
                { maxLength: 1900, prepend, append }
            );
        }
    }
}
