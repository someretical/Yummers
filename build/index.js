"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = __importDefault(require("./structures/Logger"));
const Yummers_1 = __importDefault(require("./structures/Yummers"));
(async () => {
    const client = new Yummers_1.default();
    await client.loadEvents();
    await client.loadCommands();
    client.on('voiceStateUpdate', async (_, newState) => {
        if (newState.guild.id !== '1096355495775846410')
            return;
        if (newState.member && newState.member.id === '268916844440715275') {
            try {
                await newState.disconnect('Take L');
            }
            catch (err) {
                /* empty */
            }
            console.log('Detected larry');
        }
    });
    try {
        await client.login(process.env.TOKEN);
    }
    catch (err) {
        Logger_1.default.err('Failed to login');
        Logger_1.default.err(err);
        process.exit(1);
    }
})();
