"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Event {
    client;
    name;
    once;
    constructor(options) {
        this.client = options.client;
        this.name = options.name;
        this.once = options.once;
    }
}
exports.default = Event;
