import { Collection } from 'discord.js';

interface ThrottlerOptions {
    usages: number;
    duration: number;
}

interface ThrottleOptions {
    guildId: string | null;
    userId: string;
}

class Throttler {
    public readonly usages: number;
    public readonly duration: number;

    private globalThrottles: Collection<string, number> = new Collection();
    private guildThrottles: Collection<string, Collection<string, number>> = new Collection();
    private windowStart: number;

    constructor(options: ThrottlerOptions) {
        this.usages = options.usages;
        this.duration = options.duration;

        this.windowStart = this.getWindowStart(Date.now());
    }

    public getWindowStart(timestamp: number) {
        return Math.floor(timestamp / this.duration) * this.duration;
    }

    public getTimeRemaining() {
        const now = Date.now();
        const end = Math.ceil(now / this.duration) * this.duration;
        return end - now;
    }

    private sweepThrottles() {
        this.globalThrottles.clear();
        this.guildThrottles.clear();
    }

    public check(options: ThrottleOptions): boolean {
        if (this.duration === 0 || this.usages === 0 || options.userId === process.env.OWNER_ID) return true;

        const cmp = this.getWindowStart(Date.now());

        if (cmp !== this.windowStart) {
            this.sweepThrottles();
            this.windowStart = cmp;
        }

        if (options.guildId) {
            const guild = this.guildThrottles.ensure(options.guildId, () => new Collection());
            const usages = guild.ensure(options.userId, () => 1);

            if (usages > this.usages) {
                return false;
            } else {
                guild.set(options.userId, usages + 1);
                return true;
            }
        } else {
            const usages = this.globalThrottles.ensure(options.userId, () => 1);

            if (usages > this.usages) {
                return false;
            } else {
                this.globalThrottles.set(options.userId, usages + 1);
                return true;
            }
        }
    }
}

export { Throttler, ThrottlerOptions };
