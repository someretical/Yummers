"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Command {
    client;
    builder;
    constructor(options) {
        this.client = options.client;
        this.builder = options.builder;
    }
}
exports.default = Command;
