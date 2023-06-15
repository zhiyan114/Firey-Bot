import { ApplicationCommandType, ContextMenuCommandBuilder, EmbedBuilder, UserContextMenuCommandInteraction } from "discord.js"
import { ICommand } from "../interface"
import { DiscordUser } from "../ManagerUtils/DiscordUser"
import { prisma } from "../utils/DatabaseManager"

/* Command Builder */
const GetPointsCmd = new ContextMenuCommandBuilder()
  .setName("points")
  .setType(ApplicationCommandType.User)

/* Function Builder */
const GetPointsFunc = async (interaction : UserContextMenuCommandInteraction) => {
  // Do the usual command init
  if(!prisma) return await interaction.reply({content: "Unfortunately the database is not connected, please report this issue.", ephemeral: true})
  await interaction.deferReply({ephemeral: true})

  // Setup the embed and send it
  const targetData = new DiscordUser(interaction.targetUser)
  const embed = new EmbedBuilder()
  embed.setTitle("Total Points")
  embed.setColor("#00FFFF")
  embed.setDescription((await targetData.getCacheData())?.points?.toString() ?? "-1")
  embed.setAuthor({name: targetData.getUsername(), iconURL: interaction.targetUser.avatarURL() ?? interaction.targetUser.defaultAvatarURL})
  embed.setTimestamp()
  await interaction.followUp({embeds:[embed], ephemeral: true})
}

export default {
  command: GetPointsCmd,
  function: GetPointsFunc,
  disabled: false,
} as ICommand