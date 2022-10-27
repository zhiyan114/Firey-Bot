import { econModel } from '../DBUtils/EconomyManager';
import { twitchCmdType } from './index';


const getPointsFunc : twitchCmdType ={
    name: "getpoints",
    func: async (data) => {
        if(!data.user['user-id']) return;
        if(data.authUsers[data.user['user-id']] == "-1") return data.client.say(data.channel,`@${data.user.username}, your account is not linked yet. Do that first then try again.`);
        let discordUserID = data.authUsers[data.user['user-id']];
        if(!discordUserID) {
            // Get the user ID since it's not available when the stream is offline
            const userData = await econModel.findOne({"twitch.ID": data.user['user-id']});
            if(userData) discordUserID = userData._id
        }
        // Fetch the points
        const econData = await econModel.findOne({_id: discordUserID})
        if(!econData) return await data.client.say(data.channel,`${data.user.username}, you have 0 points!`);
        await data.client.say(data.channel,`@${data.user.username}, you have ${econData?.points} points!`);
    } 
 }

 export default getPointsFunc;