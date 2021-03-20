import config from '../config';
import BlechadlerPlugin from './Plugin';
import Arma3Service from '../services/Arma3Service';
export default class Arma3ServerPlugin extends BlechadlerPlugin {
    setup(): void {
        this.blechadler.registerPlugin(Arma3ServerPlugin.name);
        const { ip, port, queryInterval, serverStatusChannelId, serverPlayerUpdateChannelId } = config.arma3;
        const botChannel = config.botChannel;
        const service = new Arma3Service(ip, port, queryInterval);
        const sendUpdate = (msg: string) => {
            this.blechadler.sendMessageToChannel(serverPlayerUpdateChannelId, msg);
        };
        service.on('connected', (playerName: string) => {
            // sendUpdate(`➡️  **${playerName}** joined`);
        });
        service.on('disconnected', (playerName: string) => {
            //  sendUpdate(`⬅️  **${playerName}** left`);
        });
        // subscribe to !server messages
        this.blechadler.subscribeToMessages(msg => /^⠀*!server⠀*$/i.test(msg.content), [botChannel], async msg => {
            try {
                const response = await service.buildServerResponse();
                msg.reply(response);
            } catch (err) {
                msg.reply('Da is irgendetwas schief gelaufen 😰. Bitte hau mich nicht 🥺');
            }
        });
        service.registerServerEmbed(this.blechadler, serverStatusChannelId);
    }
}
