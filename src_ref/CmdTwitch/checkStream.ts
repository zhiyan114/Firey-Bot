import { streamCli } from "../index";
import { twitchCmdType } from "./index";


const checkStream : twitchCmdType ={
  name: "checkstream",
  func: async (data) => {
    await data.client.say(data.channel, `@${data.user.username}, the stream state is ${streamCli.isStreaming}`);
  } 
};

export default checkStream;