"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginate = exports.createOffsetDate = exports.stringToBirthday = exports.getEmbed = exports.databaseError = exports.DatabaseErrorType = void 0;
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
function stringToBirthday(user, year) {
    /*
    The reason why we need to first set the year to 2000 and THEN set it to the proper year is really janky.
    Let us say that the user's birthday is March 1st 2004 at 12:00 AM UTC+10:00. This means the birthday happened at 2PM UTC on February 29th 2004. This is version that is stored in the database.

    The validateUTCBirthday function below will return true if we pass in the year 2023.
    adjusted will have the following properties:
    - year: 2004
    - month: 2
    - day: 29
    - hour: 14
    - minute: 0

    And then we add on the utc offset which is 600 because it is +10:00. This changes the date so now it is:
    - year: 2004
    - month: 3
    - day: 1
    - hour: 0
    - minute: 0

    Now we set the year to 2023. This changes the date to:
    - year: 2023
    - month: 3
    - day: 1
    - hour: 0
    - minute: 0
    which is valid.

    However if we do:
    DateTime.utc(
        year,
        parseInt(user.birthday_utc.substring(0, 2)),
        parseInt(user.birthday_utc.substring(2, 4)),
        parseInt(user.birthday_utc.substring(4, 6)),
        parseInt(user.birthday_utc.substring(6))
    )...
    below, then we end up with a date that is invalid because it has the following properties:
    - year: 2023
    - month: 2
    - day: 29
    - hour: 14
    - minute: 0

    This is why we have to first set the year to 2000 and then afterwards set it to the actual year we want. The set() function will properly "round" the date to the correct one that we want which is actually Februrary 28th 2PM UTC or March 1st 12AM UTC+10:00.

    This is also why in the validateUTCBirthday function we cannot use the set() function to set the new year. We do NOT want the set function to round the date if it becomes invalid! This is why we construct a new date and directly check if it's invalid.
    */
    return luxon_1.DateTime.utc(2000, parseInt(user.birthday_utc.substring(0, 2)), parseInt(user.birthday_utc.substring(2, 4)), parseInt(user.birthday_utc.substring(4, 6)), parseInt(user.birthday_utc.substring(6)))
        .setZone(luxon_1.FixedOffsetZone.instance(user.birthday_utc_offset))
        .set({ year });
}
exports.stringToBirthday = stringToBirthday;
function createOffsetDate(user, year) {
    const adjusted = luxon_1.DateTime.utc(user.leap_year ? 2000 : 2001, parseInt(user.birthday_utc.substring(0, 2)), parseInt(user.birthday_utc.substring(2, 4)), parseInt(user.birthday_utc.substring(4, 6)), parseInt(user.birthday_utc.substring(6))).plus({ minutes: user.birthday_utc_offset });
    return luxon_1.DateTime.utc(year, adjusted.month, adjusted.day, adjusted.hour, adjusted.minute);
}
exports.createOffsetDate = createOffsetDate;
function paginate(array, pageSize, pageNumber) {
    return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
}
exports.paginate = paginate;
