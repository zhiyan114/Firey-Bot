import { ButtonInteraction, GuildMember } from "discord.js";
import { DiscordClient } from "../../core/DiscordClient";
import { DiscordUser } from "../../utils/DiscordUser";
import { startSpan } from "@sentry/node";

export async function VertificationHandler(client: DiscordClient, interaction: ButtonInteraction) {
  if(interaction.user.bot)
    return interaction.reply({ content: "PRIVILEGE INSUFFICIENT!", ephemeral: true });

  await startSpan({
    name: "Discord Verification Handler",
    op: "event.helper.VertificationHandler",
    parentSpan: null
  }, async () => {
    const user = new DiscordUser(client, interaction.user);
    const member = interaction.member as GuildMember | null;
    if(!member) return;

    // Check is already verified
    const newUserRole = client.config.newUserRoleID;
    if(member.roles.cache.has(newUserRole) && await user.isVerified())
      return await interaction.reply({ content: "You are already verified!", ephemeral: true });

    await startSpan({
      name: "Update Verification Status",
      op: "VertificationHandler.updateStatus",
    }, async()=>{
      // Update the user
      await member.roles.add(newUserRole, "Confirmation Role");
      await user.updateUserData({ rulesconfirmedon: new Date() });

      // Send the message
      await interaction.reply({ content: "Thank you for confirming the rules.", ephemeral: true });
      await client.logger.sendLog({
        type: "Interaction",
        message: `**${interaction.user.tag}** has confirmed the rules.`
      });
    });
  });
}