import { CommandInteraction, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';
import BirthdayClient from './BirthdayClient';

interface CommandOptions {
    client: BirthdayClient;
    builder: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
}

export default abstract class Command {
    public client: BirthdayClient;
    public builder: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;

    constructor(options: CommandOptions) {
        this.client = options.client;
        this.builder = options.builder;
    }

    abstract run(interaction: CommandInteraction): void;
}
