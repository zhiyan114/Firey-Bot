import { DiscordInvite } from '../ManagerUtils/DiscordInvite';
import { twitch } from '../config';
import { twitchCmdType } from './index';

const discordFunc : twitchCmdType ={
    name: "discord",
    func: async (data) => await data.client.say(data.channel,`@${data.user.username}, here is our discord invite link: ${
        await new DiscordInvite("twitchChat").getTempInvite({
            reason: "Twitch Chat Requested a Link"
        })
    }`),
    disabled: false
 }

 export default discordFunc;