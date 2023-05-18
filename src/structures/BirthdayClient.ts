import * as fs from 'fs';
import * as path from 'path';

import { ActivityType, Client, Collection, ColorResolvable, GatewayIntentBits } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import Command from './Command';
import Event from './Event';

class BirthdayClient extends Client {
    commands: Collection<string, Command>;
    prisma: PrismaClient;
    embedColour: ColorResolvable;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.DirectMessageReactions,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.Guilds,
                GatewayIntentBits.MessageContent
            ],
            presence: {
                status: 'online',
                activities: [
                    {
                        name: 'for birthdays 🎂',
                        type: ActivityType.Watching
                    }
                ]
            }
        });

        this.commands = new Collection();
        this.prisma = new PrismaClient();
        this.embedColour = process.env.EMBED_COLOUR as ColorResolvable;
    }

    async loadEvents(): Promise<void> {
        const eventPath = path.join(__dirname, '..', 'events');
        console.log(`Looking for events in ${eventPath}`);

        const inodes = fs.readdirSync(eventPath);
        const files = inodes.filter((inode) => {
            const stat = fs.statSync(path.join(eventPath, inode));
            return stat.isFile();
        });

        let counter = 0;
        for (const file of files) {
            try {
                // interface EventImport {
                //     default: typeof Event;
                // }
                // This does not work because Event is an abstract class
                // What would work is if we could tell typescript that default is a constructor of a concrete class that inherits from Event which is abstract.

                const exportObj = await import(path.join(eventPath, file));

                const event = new exportObj.default(this);

                this[event.once ? 'once' : 'on'](event.name, (...args) => event.run(...args));

                counter++;
            } catch (err) {
                console.error(err);
            }
        }

        console.log(`Loaded ${counter} events`);
    }

    async loadCommands(): Promise<void> {
        const cmdPath = path.join(__dirname, '..', 'commands');
        console.log(`Looking for commands in ${cmdPath}`);

        const inodes = fs.readdirSync(cmdPath);
        const files = inodes.filter((inode) => {
            const stat = fs.statSync(path.join(cmdPath, inode));
            return stat.isFile();
        });

        let counter = 0;
        for (const file of files) {
            try {
                const exportObj = await import(path.join(cmdPath, file));
                const command: Command = new exportObj.default(this);

                this.commands.set(command.builder.name, command);
                counter++;
            } catch (err) {
                console.error(err);
            }
        }

        console.log(`Loaded ${counter} commands`);
    }
}

export default BirthdayClient;
