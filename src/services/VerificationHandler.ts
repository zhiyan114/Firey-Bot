/* Button Creator Reference: const embed=new MessageEmbed();embed.setTitle("Rule Verification");embed.setColor("#00FF00");embed.setDescription("Please press the **confirm** button below to confirm that you have read the rules above");const row=new MessageActionRow();const btn=new MessageButton();btn.setCustomId("RuleConfirm");btn.setLabel("Confirm");btn.setStyle("SUCCESS");row.addComponents(btn);channel.send({embeds:[embed],components:[row]}); */

import { ButtonInteraction, GuildMember, User } from 'discord.js';
import { userRoleManager as RoleManager } from '../utils/roleManager';
import { sendLog, LogType } from '../utils/eventLogger';
import { newUserRoleID } from '../../config.json';
export default async (interaction : ButtonInteraction) => {
    const userRole = new RoleManager(interaction.member as GuildMember);
    if(await userRole.check(newUserRoleID)) return await interaction.reply({content: "You've already confirmed the rules.", ephemeral: true});
    await userRole.add(newUserRoleID);
    await interaction.reply({content: "Thank you for confirming the rules.", ephemeral: true});
    await sendLog(LogType.Interaction, `${(interaction.member.user as User).tag} confirmed the rules.`);
}