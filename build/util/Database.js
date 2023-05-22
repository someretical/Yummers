"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseError = exports.DatabaseErrorType = void 0;
const EmbedHelper_1 = require("./EmbedHelper");
var DatabaseErrorType;
(function (DatabaseErrorType) {
    DatabaseErrorType["Read"] = "reading";
    DatabaseErrorType["Write"] = "writing";
})(DatabaseErrorType = exports.DatabaseErrorType || (exports.DatabaseErrorType = {}));
async function databaseError(err, type, interaction) {
    console.log(err);
    await interaction.reply({
        embeds: [(0, EmbedHelper_1.getEmbed)().setTitle('Database Error').setDescription(`There was an error while ${type} the database!`)]
    });
}
exports.databaseError = databaseError;
