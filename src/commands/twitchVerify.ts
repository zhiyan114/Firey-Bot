import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, EmbedBuilder } from "discord.js"
import { prisma } from "../utils/DatabaseManager"
import { ICommand } from "../interface"
import { TwitchUser } from "../ManagerUtils/TwitchUser"

/* Command Builder */
const twitchLinkCmd = new SlashCommandBuilder()
  .setName("tverify")
  .setDescription("Verify your twitch account")
  .addStringOption(option=>
    option.setName("username")
      .setDescription("Your twitch username")
      .setRequired(true)
  )

/* Function Builder */
const twitchLinkFunc = async (interaction : CommandInteraction) => {
  if(!prisma) return
  const twitchUsername = interaction.options.get("username",true).value as string
  await interaction.deferReply({ephemeral: true})
  const embed = new EmbedBuilder()
    .setTitle("Link Twitch Account")
    .setFooter({text: "Twitch Linking System"})
    .setTimestamp()
    // Check if there is a verification request for the user
  const userReq = await prisma.twitch.findFirst({
    where: {
      memberid: interaction.user.id,
      username: twitchUsername,
    }
  })
  if(!userReq) {
    // No request for the user is found
    embed.setColor("#FF0000")
    embed.setDescription(`No verification request for this username has been found under your account's ID. Please go on Firey's twitch chat and run the command: \`!link ${interaction.user.id}\` to get started.`)
    return await interaction.followUp({embeds:[embed], ephemeral: true})
  }
  if(userReq.verified) {
    // Account is already verified
    embed.setColor("#FFFF00")
    embed.setDescription("Your account has already been verified, if this is a mistake, please contact zhiyan114")
    return await interaction.followUp({embeds:[embed], ephemeral: true})
  }
  // Verify the user
  await prisma.twitch.update({
    data: {
      verified: true
    },
    where: {
      memberid: interaction.user.id,
      username: twitchUsername,
    }
  })
  embed.setColor("#00FF00")
  embed.setDescription("Your twitch account has been successfully verified, please contact zhiyan114 if you need it changed in the future.")
  const tUser = new TwitchUser(userReq.id)
  if(await tUser.cacheExists()) {
    // There is already a cache record in redis, update it.
    tUser.updateDataCache({
      memberid: interaction.user.id,
      username: userReq.username,
      verified: true
    })
  }
  return await interaction.followUp({embeds:[embed], ephemeral: true})
}

export default {
  command: twitchLinkCmd,
  function: twitchLinkFunc,
  disabled: false,
} as ICommand