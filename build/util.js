"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginate = exports.stringToBirthday = exports.getEmbed = exports.databaseError = exports.DatabaseErrorType = void 0;
const discord_js_1 = require("discord.js");
const luxon_1 = require("luxon");
const Logger_1 = __importDefault(require("./structures/Logger"));
var DatabaseErrorType;
(function (DatabaseErrorType) {
    DatabaseErrorType["Read"] = "reading";
    DatabaseErrorType["Write"] = "writing";
})(DatabaseErrorType = exports.DatabaseErrorType || (exports.DatabaseErrorType = {}));
async function databaseError(err, type, interaction) {
    Logger_1.default.err(`Database error`);
    Logger_1.default.err(err);
    await interaction.reply({
        embeds: [getEmbed().setTitle('Database Error').setDescription(`There was an error while ${type} the database!`)]
    });
}
exports.databaseError = databaseError;
function getEmbed() {
    return new discord_js_1.EmbedBuilder().setColor(process.env.EMBED_COLOUR);
}
exports.getEmbed = getEmbed;
function stringToBirthday(dateString, offset, year = 2000) {
    const zone = luxon_1.FixedOffsetZone.instance(offset);
    const birthday = luxon_1.DateTime.fromObject({
        year: year,
        month: parseInt(dateString.substring(0, 2)),
        day: parseInt(dateString.substring(2, 4)),
        hour: parseInt(dateString.substring(4, 6)),
        minute: parseInt(dateString.substring(6))
    }, { zone: zone }).plus({ minutes: zone.offset(0) });
    return birthday;
}
exports.stringToBirthday = stringToBirthday;
function paginate(array, pageSize, pageNumber) {
    return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
}
exports.paginate = paginate;
