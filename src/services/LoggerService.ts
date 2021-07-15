import config from '../config';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

export class LoggerService extends EventEmitter {
    private static instance: LoggerService;
    private logDirPath: string;
    constructor() {
        super();
        this.logDirPath = path.join(process.env.botDir, '..', config.bot.logdir);
    }

    public static getInstance(): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }

        return LoggerService.instance;
    }

    public async writeLog(module: string, severity: 'Information'|'Warning'|'Critical', content: string): Promise<void> {
        this.createLogDirIfNotExists();
        const message = `[${new Date().toISOString()}] [${module}] [${severity}] ${content}\r\n`;
        let logPath = path.join(this.logDirPath, 'info.log');
        if (config.bot.debug) {
            this.emit('messageToUser', config.bot.botMaintainer, message);
        }
        if (severity !== 'Information') {
            this.emit('messageToUser', config.bot.botMaintainer, message);
            logPath = path.join(this.logDirPath, 'error.log');
        }
        fs.appendFileSync(logPath, message);
    }

    private createLogDirIfNotExists() {
        if (!fs.existsSync(this.logDirPath)) {
            fs.mkdirSync(this.logDirPath);
        }
    }
}
