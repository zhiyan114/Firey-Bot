/* Button Creator Reference: const embed=new MessageEmbed();embed.setTitle("Rule Verification");embed.setColor("#00FF00");embed.setDescription("Please press the **confirm** button below to confirm that you have read the rules above");const row=new MessageActionRow();const btn=new MessageButton();btn.setCustomId("RuleConfirm");btn.setLabel("Confirm");btn.setStyle("SUCCESS");row.addComponents(btn);channel.send({embeds:[embed],components:[row]}); */

import { ButtonInteraction } from 'discord.js';
import VerificationMethod from './VerificationHandler'

export default async function ButtonInteract(interaction: ButtonInteraction) {
    // Rule Confirmation Button
    if(interaction.customId === "RuleConfirm") await VerificationMethod(interaction);
}