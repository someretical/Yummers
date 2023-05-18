import BirthdayClient from './structures/BirthdayClient';

(async () => {
    const client = new BirthdayClient();
    await client.loadEvents();
    await client.loadCommands();

    try {
        client.login(process.env.TOKEN);
    } catch (err) {
        console.log(`Login error ${err}`);
    }
})();
