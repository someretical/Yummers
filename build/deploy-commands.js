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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
(async () => {
    if (typeof process.env.TOKEN !== 'string' ||
        typeof process.env.CLIENT_ID !== 'string' ||
        typeof process.env.DEV_GUILD_ID !== 'string')
        throw new Error('Missing environment variables');
    const commands = [];
    const cmdPath = path_1.default.join(__dirname, 'commands');
    console.log(`Looking for commands in ${cmdPath}`);
    const inodes = fs_1.default.readdirSync(cmdPath);
    const files = inodes.filter((inode) => {
        const stat = fs_1.default.statSync(path_1.default.join(cmdPath, inode));
        return stat.isFile();
    });
    let counter = 0;
    for (const file of files) {
        // What is the precise type of exportObj???
        try {
            const exportObj = await Promise.resolve(`${path_1.default.join(cmdPath, file)}`).then(s => __importStar(require(s)));
            const command = new exportObj.default(undefined);
            commands.push(command.builder.toJSON());
            counter++;
        }
        catch (err) {
            console.error(err);
        }
    }
    console.log(`Loaded ${counter} commands`);
    // Construct and prepare an instance of the REST module
    const rest = new discord_js_1.REST().setToken(process.env.TOKEN);
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(process.argv[2] && process.argv[2] === '-p'
            ? discord_js_1.Routes.applicationCommands(process.env.CLIENT_ID)
            : discord_js_1.Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID), { body: commands });
        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    }
    catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();
