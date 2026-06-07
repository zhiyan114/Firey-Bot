import type { ButtonInteraction, GuildMember } from "discord.js";
import { MessageFlags } from "discord.js";
import { DiscordUser } from "../../utils/DiscordUser";
import { newUserRoleID } from "../../config.json";
import { sendLog } from "../../utils/eventLogger";
import { captureException, startSpan } from "@sentry/node";

export async function VertificationHandler(interaction: ButtonInteraction) {
  await startSpan({
    op: "VerificationHandler",
    name: "User Verification Handler",
    onlyIfParent: true
  }, async ()=> {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if(interaction.user.bot)
        return await interaction.followUp({ content: "PRIVILEGE INSUFFICIENT!", flags: MessageFlags.Ephemeral });

      const user = new DiscordUser(interaction.user);
      const member = interaction.member as GuildMember | null;
      if(!member) return;

      // Check is already verified
      if(member.roles.cache.has(newUserRoleID) && await user.isVerified())
        return await interaction.followUp({ content: "You are already verified!", flags: MessageFlags.Ephemeral });

      // Update the user
      await user.updateUserData({ rulesconfirmedon: new Date() });
      await member.roles.add(newUserRoleID, "Confirmation Role");

      // Send the message
      await interaction.followUp({ content: "Thank you for confirming the rules.", flags: MessageFlags.Ephemeral });
      await sendLog({
        type: "Interaction",
        message: `**${interaction.user.tag}** has confirmed the rules.`
      });
    } catch(ex) {
      captureException(ex);

      const content = "An error occured during verification process, please try again!";
      if(interaction.replied || interaction.deferred)
        await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
      else
        await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
  });
}