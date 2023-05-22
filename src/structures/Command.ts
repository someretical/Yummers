import {
    CommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import Yummers from './Yummers';

type CommandBuilder =
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommandGroup' | 'addSubcommand'>;

interface CommandOptions {
    client: Yummers;
    builder: CommandBuilder;
}

export default abstract class Command {
    public client: Yummers;
    public builder: CommandBuilder;

    constructor(options: CommandOptions) {
        this.client = options.client;
        this.builder = options.builder;
    }

    abstract run(interaction: CommandInteraction): void;
}
