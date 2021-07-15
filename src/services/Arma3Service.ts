import { EventEmitter } from 'events';
import { MessageEmbed } from 'discord.js';
import Blechadler from '../index';
import { LoggerService } from './LoggerService';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Gamedig = require('gamedig');

export interface ArmaPlayer {
    name: string;
    raw: {
        score: number;
        time: number
    }
}

export interface Arma3Server {
    name: string;
    map: string;
    password: boolean;
    maxplayers: number;
    players: ArmaPlayer[];
    raw: {
        protocol: number;
        folder: string;
        game: string;
        appId: number;
        numplayers: number;
        numbots: number;
        listentype: string;
        environment: string;
        secure: number;
        version: string;
        steamid: string;
        tags: string
    },
    ping: number,
    connect: string;
    bots: ArmaPlayer[];
}

declare interface Arma3Service {
    on(event: 'connected', listener: (user: ArmaPlayer) => void): this;
    on(event: 'disconnected', listener: (user: ArmaPlayer) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string | symbol, listener: (...args: any[]) => void): this;
}

class Arma3Service extends EventEmitter {
    /**
     * Username cache client-id -> nickname
     */
    private userCache: ArmaPlayer[] = [];
    private serverCache = <Arma3Server>{};
    private connected = false;

    /**
     * Initial config
     */
    private config: {
        ip: string;
        port: number;
        queryInterval: number;
    };

    /**
     * @param ip Server IP
     * @param port Server Port
     * @param queryInterval
     */
    constructor (ip: string, port: number, queryInterval = 120000) {
        super();
        this.config = { ip, port, queryInterval };
        this.queryServer();
        setInterval(() => this.queryServer(), this.config.queryInterval);
    }

    public async queryServer(): Promise<void> {
        try {
            await LoggerService.getInstance().writeLog('Arma 3 SERVICE', 'Information', 'Fetching Server Data');
            await Gamedig.query(
                {
                    type: 'arma3',
                    host: this.config.ip,
                    port: this.config.port
                }
            ).then(latestServerState => {
                LoggerService.getInstance().writeLog('Arma 3 SERVICE', 'Information', 'Received Server Data');
                this.cacheUsers(latestServerState);
                this.serverCache = latestServerState;
            });
        } catch (err) {
            LoggerService.getInstance().writeLog('Arma 3 SERVICE', 'Warning', 'Server Data empty');
        }
    }

    /**
     * This method is called periodically and caches all users
     */
    private async cacheUsers(latestServerState): Promise<void> {
        try {
            const users = latestServerState.players;
            if (this.userCache.length > 0) {
                await this.detectPlayerChanges(users);
            }
            this.userCache = users;
        } catch (err) {
            console.error(err);
        }
    }

    public async getUsers(): Promise<ArmaPlayer[]> {
        return this.userCache;
    }

    public async getServer(): Promise<Arma3Server> {
        return this.serverCache;
    }

    public async buildServerResponse(): Promise<MessageEmbed> {
        const users = await this.getUsers();
        const server = await this.getServer();
        if ('name' in server) {
            const embed = new MessageEmbed()
                .setColor('#4caf50')
                .setTimestamp(Date.now())
                .addFields([
                    {
                        name: 'Server:',
                        value: server.name
                    },
                    {
                        name: 'Current Map',
                        value: server.map,
                        inline: true
                    },
                    { name: '\u200B', value: '\u200B', inline: true },
                    {
                        name: 'Current Mission',
                        value: server.raw.game,
                        inline: true
                    },
                    {
                        name: 'IP',
                        value: server.connect,
                        inline: true
                    },
                    { name: '\u200B', value: '\u200B', inline: true },
                    {
                        name: 'Ping',
                        value: server.ping,
                        inline: true
                    },
                    {
                        name: 'Players',
                        value: `${server.players.length}/${server.maxplayers}`
                    }
                ]);
            if (users.length > 0) {
                let tmpTime = '';
                let tmpName = '';
                users.forEach(player => {
                    tmpTime += `${(
                        Math.round((player.raw.time / 60 / 60) * 100) / 100
                    ).toFixed(2)}h\n`;
                    tmpName += `${player.name}\n`;
                });
                if (tmpName.length < 1024 && tmpName.length > 0) {
                    embed.addFields(
                        [
                            {
                                name: 'Time',
                                value: tmpTime,
                                inline: true
                            },
                            {
                                name: 'Name',
                                value: tmpName,
                                inline: true
                            }
                        ]
                    );
                }
            }
            return embed;
        } else {
            return new MessageEmbed()
                .setColor('#fc0b03')
                .setTimestamp(Date.now())
                .addFields([
                    {
                        name: 'Status',
                        value: 'Requesting Server Info failed. Try again later'
                    }
                ]);
        }
    }

    private async detectPlayerChanges(users: ArmaPlayer[]) {
        const cachedPlayerNames = this.userCache.map(player => player.name);
        const currentPlayerNames = users.map(player => player.name);
        const leftServer = cachedPlayerNames.filter(playerName => !currentPlayerNames.includes(playerName));
        const joinedServer = currentPlayerNames.filter(playerName => !cachedPlayerNames.includes(playerName));
        if (leftServer) {
            this.detectedPlayerChange('disconnected', leftServer);
        }
        if (joinedServer) {
            this.detectedPlayerChange('connected', joinedServer);
        }
    }

    private detectedPlayerChange(event: 'connected'|'disconnected', players: string[]) {
        players.forEach(playerName => {
            if (playerName !== '') {
                this.emit(event, playerName);
            }
        });
    }

    public async registerServerEmbed(bot: Blechadler, serverStatusChannelId: string):Promise<void> {
        await this.queryServer();
        const message = await this.buildServerResponse();
        const helpMessage = await bot.sendMessageToChannel(serverStatusChannelId, '', { embed: message });
        setInterval(() => {
            this.buildServerResponse().then(msg => {
                helpMessage.edit('', { embed: msg });
            });
        }, 80000);
    }
}

export default Arma3Service;
