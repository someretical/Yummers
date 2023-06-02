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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const client_1 = require("@prisma/client");
const discord_js_1 = require("discord.js");
const luxon_1 = require("luxon");
const Logger_1 = __importDefault(require("./Logger"));
class Yummers extends discord_js_1.Client {
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
        Logger_1.default.info(`Looking for events in ${eventPath}`);
        const names = fs.readdirSync(eventPath);
        const files = names.filter((name) => fs.statSync(path.join(eventPath, name)).isFile());
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
                Logger_1.default.err(`Failed to import event ${file}`);
                Logger_1.default.err(err);
            }
        }
        Logger_1.default.info(`Loaded ${counter} events`);
    }
    async loadCommands() {
        const cmdPath = path.join(__dirname, '..', 'commands');
        Logger_1.default.info(`Looking for commands in ${cmdPath}`);
        const names = fs.readdirSync(cmdPath);
        const files = names.filter((name) => fs.statSync(path.join(cmdPath, name)).isFile());
        let counter = 0;
        for (const file of files) {
            try {
                const exportObj = await Promise.resolve(`${path.join(cmdPath, file)}`).then(s => __importStar(require(s)));
                const command = new exportObj.default(this);
                this.commands.set(command.builder.name, command);
                counter++;
            }
            catch (err) {
                Logger_1.default.err(`Failed to import command ${file}`);
                Logger_1.default.err(err);
            }
        }
        Logger_1.default.info(`Loaded ${counter} events`);
    }
    async celebrateUserBirthday(sGuild, guild, role, channel, userId) {
        Logger_1.default.info(`Handling user ${this.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}`);
        const guildMap = this.currentBirthdays.get(guild.id);
        if (guildMap.has(userId)) {
            Logger_1.default.warn(`User ${this.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name} already has an entry in client.currentBirthdays.get(${guild.id}) set. Skipping...`);
            return;
        }
        let member = null;
        try {
            member = await guild.members.fetch(userId);
        }
        catch (err) {
            Logger_1.default.warn(`Couldn't get member ${this.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}. Skipping...`);
            return;
        }
        if (!member)
            return;
        guildMap.set(userId, Date.now() + 24 * 60 * 60 * 1000);
        try {
            await channel.send({
                content: sGuild.birthday_message.replace('{user}', `<@${userId}>`)
            });
            Logger_1.default.info(`Sent birthday message for user ${member.user.tag} in guild ${guild.name}`);
        }
        catch (err) {
            Logger_1.default.err(`Couldn't send birthday message for user ${member.user.tag} in guild ${guild.name}`);
            Logger_1.default.err(err);
        }
        try {
            await member.roles.add(role);
            Logger_1.default.info(`Added birthday role to user ${member.user.tag} in guild ${guild.name}`);
        }
        catch (err) {
            Logger_1.default.err(`Couldn't assign birthday role for user ${member.user.tag} in guild ${guild.name}`);
            Logger_1.default.err(err);
        }
    }
    async endUserBirthday(guild, role, userId) {
        Logger_1.default.info(`Ending birthday for user ${this.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}`);
        const guildMap = this.currentBirthdays.get(guild.id);
        let member = null;
        try {
            member = await guild.members.fetch(userId);
        }
        catch (err) {
            guildMap.delete(userId);
            Logger_1.default.err(`Couldn't get member ${this.users.cache.get(userId)?.tag ?? userId} in guild ${guild.name}. Skppping...`);
            Logger_1.default.err(err);
            return;
        }
        if (!member)
            return;
        try {
            await member.roles.remove(role);
            guildMap.delete(userId);
            Logger_1.default.info(`Removed birthday role from user ${member.user.tag} in guild ${guild.name}`);
        }
        catch (err) {
            Logger_1.default.err(`Couldn't remove birthday role from user ${member.user.tag} in guild ${guild.name}`);
            Logger_1.default.err(err);
        }
    }
    async handleNewGuildBirthdays(sGuild, userIds) {
        Logger_1.default.info(`Handling guild ${sGuild.id}`);
        let guild = null;
        let birthdayChannel = null;
        let birthdayRole = null;
        try {
            guild = await this.guilds.fetch(sGuild.id);
        }
        catch (err) {
            Logger_1.default.err(`Couldn't get guild ${sGuild.id}. Skipping...`);
            Logger_1.default.err(err);
            this.currentBirthdays.delete(sGuild.id);
            return [];
        }
        try {
            birthdayChannel = (await guild.channels.fetch(sGuild.birthday_channel_id));
        }
        catch (err) {
            Logger_1.default.err(`Couldn't get birthday channel for guild ${guild.name}. Skipping...`);
            Logger_1.default.err(err);
            return [];
        }
        try {
            birthdayRole = await guild.roles.fetch(sGuild.birthday_role_id);
        }
        catch (err) {
            Logger_1.default.err(`Couldn't get birthday role for guild ${guild.name}. Skipping...`);
            Logger_1.default.err(err);
            return [];
        }
        if (!birthdayChannel || !birthdayRole) {
            Logger_1.default.warn('Birthday channel or role does not exist. Skipping...');
            return [];
        }
        if (!this.currentBirthdays.has(guild.id)) {
            this.currentBirthdays.set(guild.id, new Map());
        }
        const promises = [];
        for (const userId of userIds) {
            promises.push(this.celebrateUserBirthday(sGuild, guild, birthdayRole, birthdayChannel, userId));
        }
        return Promise.allSettled(promises);
    }
    async fetchNewBirthdays(startWindow, endWindow, userId, guildId) {
        const startWindowString = startWindow.toFormat('LLddHHmm');
        const endWindowString = endWindow.toFormat('LLddHHmm');
        const query = {
            where: {
                guild: {
                    birthdays_enabled: true,
                    birthday_channel_id: {
                        not: null
                    },
                    birthday_role_id: {
                        not: null
                    }
                },
                user: undefined
            },
            select: {
                guild: {
                    select: {
                        id: true,
                        birthday_channel_id: true,
                        birthday_role_id: true,
                        birthday_message: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        birthday_utc: true
                    }
                }
            }
        };
        if (guildId)
            query.where.guild.id = guildId;
        // We assume that the max interval is one day.
        // This means if the window crosses years, then the start must be the same day as the last day of the previous year and the end must be the same day as the first day of the next (crrrent) year.
        if (startWindow.year !== endWindow.year) {
            const prevYearEndString = startWindow.endOf('year').toFormat('LLddHHmm');
            const curYearStartString = endWindow.startOf('year').toFormat('LLddHHmm');
            const conditions = {
                OR: [
                    {
                        AND: [
                            {
                                birthday_utc: {
                                    gte: startWindowString
                                }
                            },
                            {
                                birthday_utc: {
                                    lte: prevYearEndString
                                }
                            }
                        ]
                    },
                    {
                        AND: [
                            {
                                birthday_utc: {
                                    gte: curYearStartString
                                }
                            },
                            {
                                birthday_utc: {
                                    lte: endWindowString
                                }
                            }
                        ]
                    }
                ]
            };
            if (userId) {
                // conditions.OR[0].AND.push({ id: userId });
                // This is truly a TypeScript moment
                conditions.OR[0]
                    .AND.push({
                    id: userId
                });
                conditions.OR[1]
                    .AND.push({
                    id: userId
                });
            }
            query.where.user = conditions;
        }
        else {
            const conditions = {
                AND: [
                    {
                        birthday_utc: {
                            gte: startWindowString
                        }
                    },
                    {
                        birthday_utc: {
                            lte: endWindowString
                        }
                    }
                ]
            };
            if (userId)
                conditions.AND.push({ id: userId });
            query.where.user = conditions;
        }
        const expanded = await this.prisma.guildUser.findMany(query);
        return expanded.filter(({ user }) => luxon_1.DateTime.fromObject({
            year: user.birthday_utc < startWindowString ? endWindow.year : startWindow.year,
            month: parseInt(user.birthday_utc.substring(0, 2)),
            day: parseInt(user.birthday_utc.substring(2, 4)),
            hour: parseInt(user.birthday_utc.substring(4, 6)),
            minute: parseInt(user.birthday_utc.substring(6))
        }).isValid);
    }
    async scanExpiredBirthdays() {
        Logger_1.default.info('\nScanning old birthdays...');
        const scanGuilds = async (guildId, userMap) => {
            Logger_1.default.info(`Handling guild ${guildId}`);
            let guild = null;
            let sGuild = null;
            let birthdayRole = null;
            try {
                guild = await this.guilds.fetch(guildId);
            }
            catch (err) {
                Logger_1.default.err(`Couldn't get guild ${guildId}. Skipping...`);
                Logger_1.default.err(err);
                this.currentBirthdays.delete(guildId);
                return;
            }
            try {
                sGuild = await this.prisma.guild.findUnique({
                    where: {
                        id: guildId
                    }
                });
            }
            catch (err) {
                Logger_1.default.err(`Couldn't get birthday role ID for guild ${guild.name}. Skipping...`);
                Logger_1.default.err(err);
                return;
            }
            if (!sGuild || !sGuild.birthday_role_id || !sGuild.birthdays_enabled) {
                Logger_1.default.warn(`Guild does not exist in databse/empty role ID/birthdays not enabled. Skipping...`);
                return;
            }
            try {
                birthdayRole = await guild.roles.fetch(sGuild.birthday_role_id);
            }
            catch (err) {
                Logger_1.default.err(`Couldn't get birthday role for guild ${guild.name}. Skipping...`);
                Logger_1.default.err(err);
                return;
            }
            if (!birthdayRole) {
                Logger_1.default.warn(`Birthday role does not exist. Skipping...`);
                return;
            }
            const promises = [];
            for (const [userId, birthdayEnd] of userMap) {
                if (birthdayEnd <= Date.now())
                    promises.push(this.endUserBirthday(guild, birthdayRole, userId));
            }
            return Promise.allSettled(promises);
        };
        const promises = [];
        for (const [guildId, userMap] of this.currentBirthdays) {
            promises.push(scanGuilds(guildId, userMap));
        }
        try {
            await Promise.allSettled(promises);
        }
        catch (err) {
            Logger_1.default.err('Failed to handle old birthdays');
            Logger_1.default.err(err);
        }
        Logger_1.default.info('Finished handling old birthdays');
    }
    async scanNewBirthdays(interval, utcNow = null, userId = null, guildId = null) {
        Logger_1.default.info('\nScanning new birthdays...');
        if (!utcNow)
            utcNow = luxon_1.DateTime.utc();
        const startWindow = utcNow.minus(luxon_1.Duration.fromObject({ milliseconds: interval + 5000 }));
        const endWindow = utcNow;
        Logger_1.default.info(`UTC now: ${utcNow.toFormat('LLLL dd HH:mm')}`);
        Logger_1.default.info(`Start window: ${startWindow.toFormat('LLLL dd HH:mm')}`);
        Logger_1.default.info(`End window: ${endWindow.toFormat('LLLL dd HH:mm')}`);
        Logger_1.default.info(`Next refresh at ${endWindow
            .plus(luxon_1.Duration.fromObject({ milliseconds: interval }))
            .toFormat('LLLL dd HH:mm')}`);
        let relos = [];
        try {
            relos = await this.fetchNewBirthdays(startWindow, endWindow, userId, guildId);
        }
        catch (err) {
            Logger_1.default.err(`Failed to retrieve elegible guild/user relationships from the database`);
            Logger_1.default.err(`userId: ${userId}, guildId: ${guildId}`);
            Logger_1.default.err(err);
            return;
        }
        Logger_1.default.info(`Retrieved ${relos.length} elegible guild/user relationships from the database`);
        if (relos.length === 0) {
            return;
        }
        const guildUserMap = new Map();
        const guildMap = new Map();
        for (const relo of relos) {
            if (!guildUserMap.has(relo.guild.id)) {
                guildUserMap.set(relo.guild.id, []);
                guildMap.set(relo.guild.id, relo.guild);
            }
            guildUserMap.get(relo.guild.id).push(relo.user.id);
        }
        const promises = [];
        for (const [gId, userIds] of guildUserMap) {
            promises.push(this.handleNewGuildBirthdays(guildMap.get(gId), userIds));
        }
        try {
            await Promise.allSettled(promises);
        }
        catch (err) {
            Logger_1.default.err('Failed to handle new birthdays');
            Logger_1.default.err(err);
        }
        Logger_1.default.info('Finished handling new birthdays');
    }
}
exports.default = Yummers;
