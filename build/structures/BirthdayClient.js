"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const client_1 = require("@prisma/client");
const discord_js_1 = require("discord.js");
class BirthdayClient extends discord_js_1.Client {
    commands;
    prisma;
    embedColour;
    currentBirthdays;
    constructor() {
        super({
            intents: [
                discord_js_1.GatewayIntentBits.DirectMessageReactions,
                discord_js_1.GatewayIntentBits.DirectMessages,
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMembers,
                discord_js_1.GatewayIntentBits.GuildMessageReactions,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.GuildModeration,
                discord_js_1.GatewayIntentBits.MessageContent
            ],
            presence: {
                status: 'online',
                activities: [
                    {
                        name: 'for birthdays 🎂',
                        type: discord_js_1.ActivityType.Watching
                    }
                ]
            }
        });
        this.commands = new discord_js_1.Collection();
        this.prisma = new client_1.PrismaClient();
        this.embedColour = process.env.EMBED_COLOUR;
        this.currentBirthdays = new Map();
    }
    async loadEvents() {
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
                const exportObj = await Promise.resolve(`${path.join(eventPath, file)}`).then(s => __importStar(require(s)));
                const event = new exportObj.default(this);
                this[event.once ? 'once' : 'on'](event.name, (...args) => event.run(...args));
                counter++;
            }
            catch (err) {
                console.error(err);
            }
        }
        console.log(`Loaded ${counter} events`);
    }
    async loadCommands() {
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
                const exportObj = await Promise.resolve(`${path.join(cmdPath, file)}`).then(s => __importStar(require(s)));
                const command = new exportObj.default(this);
                this.commands.set(command.builder.name, command);
                counter++;
            }
            catch (err) {
                console.error(err);
            }
        }
        console.log(`Loaded ${counter} commands`);
    }
}
exports.default = BirthdayClient;
