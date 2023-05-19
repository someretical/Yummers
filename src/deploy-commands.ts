import { REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import Command from './structures/Command';

(async () => {
    if (
        typeof process.env.TOKEN !== 'string' ||
        typeof process.env.CLIENT_ID !== 'string' ||
        typeof process.env.DEV_GUILD_ID !== 'string'
    )
        throw new Error('Missing environment variables');

    const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

    const cmdPath = path.join(__dirname, 'commands');
    console.log(`Looking for commands in ${cmdPath}`);

    const inodes = fs.readdirSync(cmdPath);
    const files = inodes.filter((inode) => {
        const stat = fs.statSync(path.join(cmdPath, inode));
        return stat.isFile();
    });

    let counter = 0;
    for (const file of files) {
        // What is the precise type of exportObj???
        try {
            const exportObj = await import(path.join(cmdPath, file));
            const command: Command = new exportObj.default(undefined);

            commands.push(command.builder.toJSON());
            counter++;
        } catch (err) {
            console.error(err);
        }
    }

    console.log(`Loaded ${counter} commands`);

    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(process.env.TOKEN);

    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data: any = await rest.put(
            process.argv[2] && process.argv[2] === '-p'
                ? Routes.applicationCommands(process.env.CLIENT_ID)
                : Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID),
            { body: commands }
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();
