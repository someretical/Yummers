import { REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from 'discord.js';

import fs from 'fs';
import path from 'path';
import Command from './structures/Command';
import Logger from './structures/Logger';

(async () => {
    if (
        typeof process.env.TOKEN !== 'string' ||
        typeof process.env.CLIENT_ID !== 'string' ||
        typeof process.env.DEV_GUILD_ID !== 'string'
    )
        throw new Error('Missing environment variables');

    const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

    const cmdPath = path.join(__dirname, 'commands');
    Logger.info(`Looking for commands in ${cmdPath}`);

    const inodes = fs.readdirSync(cmdPath);
    const files = inodes.filter((inode) => {
        const stat = fs.statSync(path.join(cmdPath, inode));
        return stat.isFile();
    });

    let counter = 0;
    for (const file of files) {
        try {
            const exportObj = await import(path.join(cmdPath, file));
            const command: Command = new exportObj.default(undefined);

            commands.push(command.builder.toJSON());
            counter++;
        } catch (err) {
            Logger.err(`Failed to import command ${path.join(cmdPath, file)}`);
            Logger.err(err as Error);
        }
    }

    Logger.info(`Loaded ${counter} commands`);

    const rest = new REST().setToken(process.env.TOKEN);

    try {
        Logger.info(`Started refreshing ${commands.length} application (/) commands.`);

        const data: any = await rest.put(
            process.argv[2] && process.argv[2] === '-p'
                ? Routes.applicationCommands(process.env.CLIENT_ID)
                : Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID),
            { body: commands }
        );

        Logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (err) {
        Logger.err('Failed to reload application (/) commands.');
        Logger.err(err as Error);
    }
})();
