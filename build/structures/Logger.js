"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const luxon_1 = require("luxon");
const util_1 = require("util");
class Logger {
    static log(...args) {
        args.map((arg) => Logger.write((0, util_1.inspect)(arg).toString(), '[DEBUG]'));
    }
    static info(message) {
        Logger.write(message, '[INFO]');
    }
    static warn(message) {
        Logger.write(message, '[WARN]');
    }
    static err(error, printStack = true) {
        if (typeof error === 'string') {
            Logger.write(error, '[ERROR]', true);
        }
        else {
            Logger.write(error.message, `[${error.name.toUpperCase()}]`, true);
            if (printStack)
                Logger.write(error.stack || '', '[STACK]', true);
        }
    }
    static write(content, type, error = false) {
        const lines = content.split(/\r?\n/g);
        const timeNow = `<${luxon_1.DateTime.local().toFormat('yyyy-LL-dd HH:mm')}>`;
        lines.map((line) => line.length ? (error ? process.stderr : process.stdout).write(`${timeNow} ${type} ${line}\r\n`) : undefined);
    }
}
exports.default = Logger;
