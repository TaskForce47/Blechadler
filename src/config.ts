interface TeamspeakConfig {
    ip: string;
    port: number;
    sid: number;
    username: string;
    password: string;
    discordChannelIDs: string[];
}

interface Arma3Config {
    ip: string;
    port: number;
    queryInterval: number;
    serverStatusChannelId: string;
    serverPlayerUpdateChannelId: string;
}

interface BirthdaysConfig {
    discordChannelIDs: string[];
}

interface LeetConfig {
    discordChannelIDs: string[];
}

interface Bot {
    generalChannel: string;
    token: string;
    botChannel: string;
    botActivity: string;
    botActivityType: 'PLAYING'|'COMPETING'|'CUSTOM_STATUS'|'LISTENING'|'STREAMING'|'WATCHING'|'';
    logdir: string;
    heartbeatInterval: number;
    botMaintainer: string;
    debug: boolean;
    guildID: string;
}

interface Plugins {
    teamspeak: TeamspeakConfig;
    arma3: Arma3Config;
    birthdays: BirthdaysConfig;
    leet: LeetConfig;
}

interface Config {
    bot: Bot;
    plugins: Plugins;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const config: Config = require('../config/config.json');
export default config;
