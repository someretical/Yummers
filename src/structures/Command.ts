import {
    CommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import BirthdayClient from './BirthdayClient';

type CommandBuilder =
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommandGroup' | 'addSubcommand'>;

interface CommandOptions {
    client: BirthdayClient;
    builder: CommandBuilder;
}

export default abstract class Command {
    public client: BirthdayClient;
    public builder: CommandBuilder;

    constructor(options: CommandOptions) {
        this.client = options.client;
        this.builder = options.builder;
    }

    abstract run(interaction: CommandInteraction): void;
}
