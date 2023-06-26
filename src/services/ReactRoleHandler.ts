/* Message Maker: const MessageEmbed=require("discord.js").MessageEmbed;const embed=new MessageEmbed();embed.setColor("#00FFFF");embed.setDescription("If you would like to know when the derg is streaming. Please press on <a:FireyTailwag:907314933648199700> to be in the know when he goes live.\nTo be pinged for any videos recently uploaded to his youtube press on <:FireyPeek:941368077856161885>"); client.channels.cache.find(channel => channel.id === "908719210040008755").send({embeds:[embed]}); */
/* Message Reactor: const msg = (client.channels.cache.find(opt=>opt.id === "908719210040008755")).messages.cache.find(opt=>opt.id === "970021524763471893"); msg.react("<a:FireyTailwag:907314933648199700>"); msg.react("<:FireyPeek:941368077856161885>"); */
import { Client, TextChannel, MessageReaction, User } from "discord.js";
import {guildID, reactionRole} from "../config";

// Internal Interface
interface IReactRoleList {
    [key: string]: string;
}
/*
const AllRolesGrant : IReactRoleList = {
    "907314933648199700": "908723067067437076", // Derg Gaming Role
    "941368077856161885": "946613137031974963", // Derg Showing Role
    // "Emote ID": "Role ID"
}
*/
const AllRolesGrant : IReactRoleList = reactionRole.reactionLists;

const filterEmotes = Object.entries(AllRolesGrant).map((k) => k[0]);
export default async (client : Client) => {
  const guild = client.guilds.cache.find(opt=>opt.id === guildID);
  if(!guild) return;
  const message = await (guild.channels.cache.find(opt=>opt.id ===reactionRole.channelID) as TextChannel).messages.fetch(reactionRole.messageID);
  const deleteFilter = (reaction : MessageReaction) => filterEmotes.includes(reaction.emoji.id ?? "0"); // If ID is somehow undefined, we'll feed it 0, which essentially means nothing
  const collector = message.createReactionCollector({filter: deleteFilter, dispose: true});
  collector.on("collect", async (react : MessageReaction, user : User) => {
    const member = guild.members.cache.find(opt=>opt.id === user.id);
    if(!member) return; // How would they undo the reaction if they aren't in the server...
    const role = guild.roles.cache.find(opt=>opt.id === AllRolesGrant[react.emoji.id ?? -1]);
    if(!role) return; // Role somehow not found? Just do nothing
    await member.roles.add(role);
  });
  collector.on("remove",async (react,user)=>{
    const member = guild.members.cache.find(opt=>opt.id === user.id);
    if(!member) return;
    const role = guild.roles.cache.find(opt=>opt.id === AllRolesGrant[react.emoji.id ?? -1]);
    if(!role) return; // Role somehow not found? Just do nothing
    await member.roles.remove(role);
  });
};