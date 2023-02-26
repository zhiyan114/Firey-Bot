import { twitchUser } from '../ManagerUtils/TwitchUser';
import { prisma } from '../utils/DatabaseManager';
import { twitchCmdType } from './index';


const getPointsFunc : twitchCmdType ={
    name: "getpoints",
    func: async (data) => {
        if(!prisma) return;
        if(!data.user['user-id']) return;
        const tUserData = await new twitchUser(data.user['user-id']).getCacheData();
        if(!tUserData || !tUserData.memberid) return data.client.say(data.channel,`@${data.user.username}, your account is not linked yet. Do that first then try again.`);
        // Fetch the points
        const econData = await prisma.economy.findUnique({
            where: {
                memberid: tUserData.memberid,
            }
        })
        if(!econData) return await data.client.say(data.channel,`${data.user.username}, you have 0 points!`);
        await data.client.say(data.channel,`@${data.user.username}, you have ${econData?.points} points!`);
    } 
 }

 export default getPointsFunc;