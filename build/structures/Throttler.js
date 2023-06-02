"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Throttler = void 0;
const discord_js_1 = require("discord.js");
class Throttler {
    usages;
    duration;
    globalThrottles = new discord_js_1.Collection();
    guildThrottles = new discord_js_1.Collection();
    windowStart;
    constructor(options) {
        this.usages = options.usages;
        this.duration = options.duration;
        this.windowStart = this.getWindowStart(Date.now());
    }
    getWindowStart(timestamp) {
        return Math.floor(timestamp / this.duration) * this.duration;
    }
    getTimeRemaining() {
        const now = Date.now();
        const end = Math.ceil(now / this.duration) * this.duration;
        return end - now;
    }
    sweepThrottles() {
        this.globalThrottles.clear();
        this.guildThrottles.clear();
    }
    check(options) {
        if (this.duration === 0 || this.usages === 0 || options.userId === process.env.OWNER_ID)
            return true;
        const cmp = this.getWindowStart(Date.now());
        if (cmp !== this.windowStart) {
            this.sweepThrottles();
            this.windowStart = cmp;
        }
        if (options.guildId) {
            const guild = this.guildThrottles.ensure(options.guildId, () => new discord_js_1.Collection());
            const usages = guild.ensure(options.userId, () => 1);
            if (usages > this.usages) {
                return false;
            }
            else {
                guild.set(options.userId, usages + 1);
                return true;
            }
        }
        else {
            const usages = this.globalThrottles.ensure(options.userId, () => 1);
            if (usages > this.usages) {
                return false;
            }
            else {
                this.globalThrottles.set(options.userId, usages + 1);
                return true;
            }
        }
    }
}
exports.Throttler = Throttler;
