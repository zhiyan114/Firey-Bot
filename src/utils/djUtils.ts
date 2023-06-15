/*
* Some useful Discord.JS Utility Tools for internal use
*/

import { randomUUID } from "crypto"
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, Embed, EmbedBuilder,  Message,  TextChannel } from "discord.js"

type PromptConfirmOptions = {
    customEmbed?: false
    text: string,
    title?: string,
    btnName?: {confirm: string | undefined, decline: string | undefined},
    userid?: string,
} | {
    customEmbed: true
    btnName?: {confirm: string | undefined, decline: string | undefined},
    userid?: string,
    embed: Embed,
}
/**
 * 
 * @param ClassObj Either a TextChannel or Interaction
 * @param options All the options for the Prompt
 * @returns Whether they clicked accept or decline
 */
// ((opt: InteractionReplyOptions)=>Promise<Message>) | ((opt: InteractionEditReplyOptions)=>Promise<Message>) | ((opt: MessageCreateOptions)=>Promise<Message>)
export const PromptConfirmation = (
  classObj: TextChannel | CommandInteraction,
  options: PromptConfirmOptions,
) => new Promise<boolean>(async(res,rej) =>
{
  const yesBTNID = randomUUID()
  const noBTNID = randomUUID()
  const dataToSend = {
    embeds: [
      options.customEmbed ? options.embed : new EmbedBuilder().setColor("#00FFFF")
        .setTitle(options.title || "Confirmation")
        .setDescription(options.text)
        .setTimestamp()
        .setFooter({text: `Reply in 1 minute or it will automatically select ${options.btnName?.decline || "No"}`})
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder().setCustomId(yesBTNID).setLabel(options.btnName?.confirm || "Yes").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(noBTNID).setLabel(options.btnName?.decline || "No").setStyle(ButtonStyle.Danger)
      )
    ]
  }
  let msg: Message
  if(classObj instanceof CommandInteraction) {
    if(classObj.replied) msg = await classObj.followUp(dataToSend)
    else if(classObj.deferred) msg = await classObj.editReply(dataToSend)
    else msg = await classObj.reply({...dataToSend, fetchReply: true})
  } else msg = await classObj.send(dataToSend)
  const collector = msg.createMessageComponentCollector({
    filter: (interact) => {
      // User Lock should really only be used when sending a non-ephemeral message in a guild channel
      if(options.userid && options.userid !== options.userid) return false
      if([yesBTNID,noBTNID].find(id=> interact.customId === id)) return true
      return false
    },
    time: 60000, // 1 minute in millisecond
    max: 1,
  })
  // User didn't interact with the button, return false
  collector.on("end", async (ilist)=>{
    const i = ilist.first()
    if(!i) return res(false)
    await i.update({})
    res(i.customId === yesBTNID)
  })
})