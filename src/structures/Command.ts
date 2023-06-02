import {
    CommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import { Throttler, ThrottlerOptions } from './Throttler';
import Yummers from './Yummers';

type CommandBuilder =
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommandGroup' | 'addSubcommand'>;

interface CommandOptions {
    client: Yummers;
    builder: CommandBuilder;
    throttling: ThrottlerOptions;
}

export default abstract class Command {
    public readonly client: Yummers;
    public readonly builder: CommandBuilder;
    public readonly throttler: Throttler;

    constructor(options: CommandOptions) {
        this.client = options.client;
        this.builder = options.builder;
        this.throttler = new Throttler(options.throttling);
    }

    abstract run(interaction: CommandInteraction): void;
}
