import { twitch } from '../config';
import { twitchCmdType } from './index';

const discordFunc : twitchCmdType ={
    name: "discord",
    func: async (data) => await data.client.say(data.channel,`@${data.user.username}, here is our discord invite link: ${twitch.discordInvite}`),
    disabled: false
 }

 export default discordFunc;