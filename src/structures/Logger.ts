import { DateTime } from 'luxon';
import { inspect } from 'util';

export default class Logger {
    static log(...args: any[]) {
        args.map((arg) => Logger.write(inspect(arg).toString(), '[DEBUG]'));
    }

    static info(message: string) {
        Logger.write(message, '[INFO]');
    }

    static warn(message: string) {
        Logger.write(message, '[WARN]');
    }

    static err(error: Error | string, printStack = true) {
        if (typeof error === 'string') {
            Logger.write(error, '[ERROR]', true);
        } else {
            Logger.write(error.message, `[${error.name.toUpperCase()}]`, true);
            if (printStack) Logger.write(error.stack || '', '[STACK]', true);
        }
    }

    static write(content: string, type: string, error = false) {
        const lines = content.split(/\r?\n/g);
        const timeNow = `<${DateTime.local().toFormat('yyyy-LL-dd HH:mm')}>`;
        lines.map((line) =>
            line.length ? (error ? process.stderr : process.stdout).write(`${timeNow} ${type} ${line}\r\n`) : undefined
        );
    }
}
