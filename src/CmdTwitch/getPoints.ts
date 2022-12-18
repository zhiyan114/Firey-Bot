import { prisma } from '../utils/DatabaseManager';
import { twitchCmdType } from './index';


const getPointsFunc : twitchCmdType ={
    name: "getpoints",
    func: async (data) => {
        if(!prisma) return;
        if(!data.user['user-id']) return;
        if(data.authUsers[data.user['user-id']] == "-1") return data.client.say(data.channel,`@${data.user.username}, your account is not linked yet. Do that first then try again.`);
        let discordUserID = data.authUsers[data.user['user-id']];
        // Fetch the points
        const econData = await prisma.economy.findUnique({
            where: {
                memberid: discordUserID,
            }
        })
        if(!econData) return await data.client.say(data.channel,`${data.user.username}, you have 0 points!`);
        await data.client.say(data.channel,`@${data.user.username}, you have ${econData?.points} points!`);
    } 
 }

 export default getPointsFunc;