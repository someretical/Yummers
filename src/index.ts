import Logger from './structures/Logger';
import Yummers from './structures/Yummers';

(async () => {
    const client = new Yummers();
    await client.loadEvents();
    await client.loadCommands();

    client.on('voiceStateUpdate', async (_, newState) => {
        if (newState.guild.id !== '1096355495775846410') return;
        if (newState.member && newState.member.id === '268916844440715275') {
            try {
                await newState.disconnect('Take L');
            } catch (err) {
                /* empty */
            }

            console.log('Detected larry');
        }
    });

    try {
        await client.login(process.env.TOKEN);
    } catch (err) {
        Logger.err('Failed to login');
        Logger.err(err as Error);
        process.exit(1);
    }
})();
