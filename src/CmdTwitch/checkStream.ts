import { isStreaming } from '../utils/twitchStream';
import { twitchCmdType } from './index';


const checkStream : twitchCmdType ={
    name: "checkstream",
    func: async (data) => {
        await data.client.say(data.channel, `@${data.user.tags.username}, the stream state is ${isStreaming()}`);
    } 
 }

 export default checkStream;