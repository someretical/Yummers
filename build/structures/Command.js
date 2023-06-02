"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Throttler_1 = require("./Throttler");
class Command {
    client;
    builder;
    throttler;
    constructor(options) {
        this.client = options.client;
        this.builder = options.builder;
        this.throttler = new Throttler_1.Throttler(options.throttling);
    }
}
exports.default = Command;
