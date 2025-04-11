import { CommandInteraction, DiscordAPIError, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { DiscordClient } from "../../core/DiscordClient";
import { baseCommand } from "../../core/baseCommand";
import { DiscordUser } from "../../utils/DiscordUser";
import { APIErrors } from "../../utils/discordErrorCode";
import { captureException } from "@sentry/node";

export class unbanCommand extends baseCommand {
  client: DiscordClient;
  metadata = new SlashCommandBuilder();
  access = {
    users: [],
    roles: [] as string[],
  };

  constructor(client: DiscordClient) {
    super();
    this.client = client;
    this.access.roles.push(client.config.adminRoleID);
    this.metadata 
      .setName("unban")
      .setDescription("Remove a user from the ban list")
      .setContexts([InteractionContextType.Guild])
      .addUserOption(option =>
        option.setName("user")
          .setDescription("The user to unban (user ID will work).")
          .setRequired(true)
      )
      .addStringOption(opt=>
        opt.setName("reason")
          .setDescription("Reason to unban the user (Logging purposes).")
          .setRequired(false)
          
      );
  }

  public async execute(interaction: CommandInteraction) {
    // Pull initial stuff
    const guild = interaction.guild;
    const targetUser = interaction.options.get("user", true).user;
    const reason = interaction.options.get("reason", false);
    if(!guild)
      return interaction.reply({content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral});
    if(!targetUser || targetUser.bot)
      return interaction.reply({content: "Invalid User/User's ID", flags: MessageFlags.Ephemeral});
    const target = new DiscordUser(this.client, targetUser);
    const issuer = new DiscordUser(this.client, interaction.user);
    await interaction.deferReply({flags: MessageFlags.Ephemeral});

    try {
      // Attempt to unban the user
      await interaction.guild.bans.remove(targetUser.id, reason?.value?.toString());

      // Cleanup
      await issuer.actionLog({
        actionName: "unban",
        target,
        message: `<@${targetUser.id}> has been unbanned by <@${interaction.user.id}>`,
        reason: reason?.value?.toString()
      });
      return interaction.followUp({content: `Successfully unbanned <@${targetUser.id}>.`});
    } catch(ex) {
      if(ex instanceof DiscordAPIError) {
        if(ex.code === APIErrors.UNKNOWN_USER)
          return await interaction.followUp({content: "Invalid User/User's ID", flags: MessageFlags.Ephemeral});
        if(ex.code === APIErrors.UNKNOWN_BAN)
          return await interaction.followUp({content: "The user does not exist in the ban list", flags: MessageFlags.Ephemeral});
      }
      captureException(ex);
    }

  }
}