"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BirthdayClient_1 = __importDefault(require("./structures/BirthdayClient"));
(async () => {
    const client = new BirthdayClient_1.default();
    await client.loadEvents();
    await client.loadCommands();
    try {
        client.login(process.env.TOKEN);
    }
    catch (err) {
        console.log(`Login error ${err}`);
    }
})();
