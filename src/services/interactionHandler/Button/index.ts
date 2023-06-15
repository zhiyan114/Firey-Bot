import { ButtonInteraction } from 'discord.js';
import VerificationMethod from './VerificationHandler';

export default async function ButtonInteract(interaction: ButtonInteraction) {
  // Rule Confirmation Button
  if(interaction.customId === "RuleConfirm") await VerificationMethod(interaction);
}