import Logger from './structures/Logger';
import Yummers from './structures/Yummers';

(async () => {
    const client = new Yummers();
    await client.loadEvents();
    await client.loadCommands();

    try {
        client.login(process.env.TOKEN);
    } catch (err) {
        Logger.err('Failed to login');
        Logger.err(err as Error);
    }
})();
