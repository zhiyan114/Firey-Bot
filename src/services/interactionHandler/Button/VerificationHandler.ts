import { prisma } from "../../../utils/DatabaseManager"
import { ButtonInteraction, GuildMember } from "discord.js";
import { sendLog, LogType } from "../../../utils/eventLogger";
import { newUserRoleID } from "../../../config";
import { DiscordUser } from "../../../ManagerUtils/DiscordUser";

export default async function VerificationHandler(interaction: ButtonInteraction) {
  // Rule Confirmation Button
  if(interaction.user.bot) {
    await interaction.reply({content: "PRIVILEGE INSUFFICIENT", ephemeral: true});
    return;
  }
  if(!prisma) {
    await interaction.reply({content: "The database is unavailable, please contact zhiyan114 about this.", ephemeral: true})
    return;
  }
  const user = new DiscordUser(interaction.user)
  const member = interaction.member as GuildMember;
  if(member.roles.cache.has(newUserRoleID) && await user.isVerified())
    return await interaction.reply({content: "You've already confirmed the rules.", ephemeral: true});
    // Update the rule confirmation date
  await member.roles.add(newUserRoleID, "Confirmation Role");
  await user.updateUserData({
    rulesconfirmedon: new Date()
  })
  // Thank the user for the confirmation
  await interaction.reply({content: "Thank you for confirming the rules.", ephemeral: true});
  await sendLog(LogType.Interaction, `<@${interaction.user.id}> confirmed the rules.`);
}