import * as Discord from 'discord.js';
import config from './config';
import { MessageEmbed } from 'discord.js';
import Arma3ServerPlugin from './plugins/Arma3ServerPlugin';
import { LoggerService } from './services/LoggerService';
import format from './utils/formatDate';
process.env.botDir = __dirname;
export default class Blechadler {
    private discordClient: Discord.Client;
    private activePlugins: string[] = [];
    constructor() {
        try {
            console.log('Warming up...');
            setInterval(() => {
                console.log(new Date().toISOString() + " I'm still here");
                this.updateBotActivity();
            }, config.bot.heartbeatInterval);
            this.discordClient = new Discord.Client();
            this.discordClient.login(config.bot.token);

            this.registerBotStatusCommand();

            this.discordClient.on('ready', () => {
                LoggerService.getInstance().on('messageToUser', (clientID, message) => {
                    this.sendMessageToUser(clientID, message);
                });
                LoggerService.getInstance().writeLog('Core', 'Information', 'Discord Logged In');
                this.updateBotActivity();

                // eslint-disable-next-line no-new
                new Arma3ServerPlugin(this);
            });
        } catch (err) {
            LoggerService.getInstance().writeLog('Core', 'Critical', 'Error in main loop' + err);
        }
    }

    /**
     * Send message to channel.
     * @param channelID Channel ID of text channel
     * @param message Message to send
     * @param options Message options
     */
    public async sendMessageToChannel(channelID: string, message: string|MessageEmbed, options?: Discord.MessageOptions): Promise<Discord.Message> {
        try {
            const channel = await this.discordClient.channels.fetch(channelID.toString());
            if (channel.type !== 'text') throw new Error('Cannot send message to channel with type other than "text"');
            return (channel as Discord.TextChannel).send(message, options) as Promise<Discord.Message>;
        } catch (err) {
            // TODO: Log error
        }
    }

    /**
     * Subscribe to messages, which are within given channels and pass given filter function.
     * @param filter Filter function; will be passed the message and has to return true for the callback to be called
     * @param channelIDs IDs of all channel in which message has to be for callback to called; Empty array = all channels
     * @param callback Callback
     */
    public subscribeToMessages(filter: (msg: Discord.Message) => boolean, channelIDs: string[] = [], callback: (msg: Discord.Message) => unknown): void {
        this.discordClient.on('message', msg => {
            if (channelIDs.length > 0 && !channelIDs.includes(msg.channel.id)) return;
            if (!filter(msg)) return;

            callback(msg);
        });
    }

    public async registerHelpMessage(message: string|MessageEmbed, options: Discord.MessageOptions = {}, callback: (msg: Discord.Message) => unknown): Promise<void> {
        const helpMessage = await this.sendMessageToChannel(config.bot.botChannel, message, options);

        this.subscribeToMessages(
            msg => (msg.reference && msg.reference.messageID === helpMessage.id),
            [config.bot.botChannel],
            callback
        );
    }

    public get discordClientId(): string {
        return this.discordClient.user.id;
    }

    public registerPlugin(pluginName:string):void {
        this.activePlugins.push(pluginName);
    }

    private registerBotStatusCommand() {
        this.subscribeToMessages(msg => /^⠀*!status⠀*$/i.test(msg.content), [config.bot.botChannel], async msg => {
            try {
                const response = new MessageEmbed()
                    .setColor('#4caf50')
                    .setTimestamp(Date.now())
                    .addFields(
                        { name: 'Uptime', value: format(process.uptime()) },
                        { name: 'API latency', value: `${this.discordClient.ws.ping}ms` },
                        { name: 'Memory usage', value: `${(Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100)} MB` },
                        { name: 'Active Plugins', value: `${this.activePlugins}` }
                    );
                msg.reply(response);
            } catch (err) {
                msg.reply('Da is irgendetwas schief gelaufen 😰. Bitte hau mich nicht 🥺');
            }
        });
    }

    public async clearChannel(channelId: string): Promise<void> {
        try {
            const channel = await this.discordClient.channels.fetch(channelId);
            return (channel as Discord.TextChannel).messages.fetch({ limit: 100 }).then(async collected => {
                if (collected.size > 0) {
                    await (channel as Discord.TextChannel).bulkDelete(collected, true);
                    this.clearChannel(channelId);
                }
            });
        } catch (e) {
            LoggerService.getInstance().writeLog('Core', 'Critical', 'Failed to clear channel with ID ' + channelId);
        }
    }

    private updateBotActivity() {
        if (config.bot.botActivity !== '' && config.bot.botActivityType !== '') {
            this.discordClient.user.setActivity(config.bot.botActivity, { type: config.bot.botActivityType });
        }
    }

    public async sendMessageToUser(userId: string, content: string|MessageEmbed): Promise<void> {
        try {
            this.discordClient.guilds.fetch(config.bot.guildID).then((guild: Discord.Guild) => {
                guild.members.fetch({ user: userId }).then((user: Discord.GuildMember) => {
                    user.createDM(true).then((dmChannel: Discord.DMChannel) => {
                        dmChannel.send(content);
                    });
                });
            });
        } catch (err) {
            LoggerService.getInstance().writeLog('Core', 'Critical', 'Failed to send Message to user with ID ' + userId);
        }
    }
}

// eslint-disable-next-line no-new
new Blechadler();
