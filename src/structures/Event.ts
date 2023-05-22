import Yummers from './Yummers';

interface EventOptions {
    client: Yummers;
    name: string;
    once: boolean;
}

export default abstract class Event {
    public client: Yummers;
    public name: string;
    public once: boolean;

    constructor(options: EventOptions) {
        this.client = options.client;
        this.name = options.name;
        this.once = options.once;
    }

    abstract run(args?: any): void;
}
