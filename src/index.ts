import * as Discord from 'discord.js';
import config from './config';
import { MessageEmbed } from 'discord.js';
import Arma3ServerPlugin from './plugins/Arma3ServerPlugin';

export default class Blechadler {
    private discordClient: Discord.Client;
    private activePlugins: string[] = [];
    constructor() {
        this.discordClient = new Discord.Client();
        this.discordClient.login(config.token);

        this.registerBotStatusCommand();

        this.discordClient.on('ready', () => {
            console.log('Discord Logged In');
            if (config.botActivity !== '' && config.botActivityType !== '') {
                this.discordClient.user.setActivity(config.botActivity, { type: config.botActivityType });
            }
            this.clearChannel(config.arma3.serverStatusChannelId).then(() => {
                /* eslint-disable no-new */
                // new TeamspeakPlugin(this);
                new Arma3ServerPlugin(this);
                // new BirthdayPlugin(this);
                // new LeetPlugin(this);
            });
        });
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
        const helpMessage = await this.sendMessageToChannel(config.botChannel, message, options);

        this.subscribeToMessages(
            msg => (msg.reference && msg.reference.messageID === helpMessage.id),
            [config.botChannel],
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
        this.subscribeToMessages(msg => /^⠀*!status⠀*$/i.test(msg.content), [config.botChannel], async msg => {
            try {
                const response = new MessageEmbed()
                    .setColor('#4caf50')
                    .setTimestamp(Date.now())
                    .addFields(
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

    private async clearChannel(channelId) {
        await this.discordClient.channels.fetch(channelId).then(channel => {
            (channel as Discord.TextChannel).messages.fetch({ limit: 100 }).then(messages => {
                if (messages.size > 0) {
                    (channel as Discord.TextChannel).bulkDelete(messages).then(() => {
                        console.log(`Cleared ${messages.size} Messages`);
                        this.clearChannel(channelId);
                    });
                }
            });
        });
    }
}

// eslint-disable-next-line no-new
new Blechadler();
