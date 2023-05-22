import Yummers from './structures/Yummers';

(async () => {
    const client = new Yummers();
    await client.loadEvents();
    await client.loadCommands();

    try {
        client.login(process.env.TOKEN);
    } catch (err) {
        console.log(`Login error ${err}`);
    }
})();
