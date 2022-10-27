import { twitchCmdType } from './index';

const lurkFunc : twitchCmdType ={
    name: "lurk",
    func: async (data) => await data.client.say(data.channel,`@${data.user.username} is now part of the lurking team!`),
    disabled: false
 }

 export default lurkFunc;