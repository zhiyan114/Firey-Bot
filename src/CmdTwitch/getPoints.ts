import { client } from ".."
import { DiscordUser } from "../ManagerUtils/DiscordUser"
import { TwitchUser } from "../ManagerUtils/TwitchUser"
import { prisma } from "../utils/DatabaseManager"
import { twitchCmdType } from "./index"


const getPointsFunc : twitchCmdType ={
  name: "getpoints",
  func: async (data) => {
    if(!prisma) return
    if(!data.user["user-id"]) return
    const tUserData = await new TwitchUser(data.user["user-id"]).getCacheData()
    if(!(tUserData?.memberid) || tUserData.memberid === "-1" || !tUserData.verified) return await data.client.say(data.channel,`@${data.user.username}, your account is not linked yet. Do that first then try again.`)
    // Fetch the points
    const econData = await (new DiscordUser(await client.users.fetch(tUserData.memberid))).getCacheData()
    if(!econData) return await data.client.say(data.channel,`${data.user.username}, you have 0 points!`)
    await data.client.say(data.channel,`@${data.user.username}, you have ${econData?.points} points!`)
  } 
}

export default getPointsFunc