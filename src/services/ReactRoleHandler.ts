import type { Message, MessageReaction } from "discord.js";
import type { DiscordClient } from "../core/DiscordClient";
import { ChannelType, DiscordAPIError, EmbedBuilder, } from "discord.js";
import { APIErrors } from "../utils/discordErrorCode";
import { captureException } from "@sentry/node-core";
import { guildID, reactRoles } from "../config.json";

export async function ReactRoleLoader(client: DiscordClient) {
  // General checks
  const guild = client.guilds.cache.get(guildID);
  if(!guild) return;
  const channel = guild.channels.cache.get(reactRoles.channelID);
  if(!channel) return;
  if(channel.type !== ChannelType.GuildText) return;


  // Check if the react message exists
  const msgID = (await client.service.prisma.config.findUnique({
    where: {
      key: "reactMessageID"
    }
  }))?.value;
  let msg: Message | undefined;

  try {
    msg = msgID ? await channel.messages.fetch(msgID) : undefined;
  } catch(ex) {
    if(ex instanceof DiscordAPIError && ex.code !== APIErrors.UNKNOWN_MESSAGE)
      captureException(ex);
  }

  if(!msg) {
    // Fill in the placeholders
    let finalDesc = reactRoles.Description;
    for(const { Name, EmoteID } of reactRoles.reactionLists) {
      const emoteName = client.emojis.resolve(EmoteID);
      if(!emoteName) continue;
      finalDesc = finalDesc.replaceAll(`{{${Name}}}`, `<${emoteName.animated ? "a" : ""}:${emoteName.name}:${emoteName.id}>`);
    }

    // Create the message
    const embed = new EmbedBuilder()
      .setColor("#00FFFF")
      .setDescription(finalDesc);
    msg = await channel.send({ embeds:[embed] });
    await client.service.prisma.config.upsert({
      where: {
        key: "reactMessageID"
      },
      create: {
        key: "reactMessageID",
        value: msg.id
      },
      update: {
        value: msg.id
      }
    });
  }

  // Check for missing reactions
  const emoteLists: string[] = [];
  const emoteToRole: {[key: string]: string} = {};

  // Pull in all roles stuff
  for(const { EmoteID, RoleID } of reactRoles.reactionLists) {
    if(msg.reactions.cache.size !== reactRoles.reactionLists.length)
      await msg.react(EmoteID);

    emoteLists.push(EmoteID);
    emoteToRole[EmoteID] = RoleID;
  }

  // Listen for roles
  const deleteFilter = (reaction: MessageReaction) => emoteLists.includes(reaction.emoji.id ?? "0");
  const collector = msg.createReactionCollector({ filter: deleteFilter, dispose: true });

  collector.on("collect", async(react, user)=>{
    const member = await react.message.guild?.members.fetch(user.id);
    if(!member) return;
    const role = guild.roles.cache.find(opt=>opt.id === (emoteToRole[react.emoji.id ?? "0"] ?? "0"));
    if(!role) return;
    await member.roles.add(role);
  });

  collector.on("remove", async(react, user)=>{
    const member = await react.message.guild?.members.fetch(user.id);
    if(!member) return;
    const role = guild.roles.cache.find(opt=>opt.id === (emoteToRole[react.emoji.id ?? "0"] ?? "0"));
    if(!role) return;
    await member.roles.remove(role);
  });

}