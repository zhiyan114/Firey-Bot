import { ChannelType, CommandInteraction, DiscordAPIError, InteractionContextType, SlashCommandBuilder } from "discord.js";
import { DiscordClient } from "../../core/DiscordClient";
import { baseCommand } from "../../core/baseCommand";
import { DiscordUser } from "../../utils/DiscordUser";
import { APIErrors } from "../../utils/discordErrorCode";
import { captureException } from "@sentry/node";

export class purgeCommand extends baseCommand {
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
      .setName("purge")
      .setDescription("Purge messages from a channel")
      .setContexts([InteractionContextType.Guild])
      .addNumberOption(option =>
        option.setName("amount")
          .setDescription("The amount of messages to purge. Maximum 100.")
          .setRequired(true)
      )
      .addStringOption(opt=>
        opt.setName("reason")
          .setDescription("The reason for the purge")
          .setRequired(false)
      );
  }
  public async execute(interaction: CommandInteraction) {
    // Initial Setup
    const amount = interaction.options.get("amount", true).value as number;
    const reason = interaction.options.get("reason", false)?.value as string | undefined;
    const issuer = new DiscordUser(this.client, interaction.user);

    // Some checks
    if(amount < 1 || amount > 100)
      return await interaction.reply({content: "The amount of messages to purge must be between 1 and 100.", ephemeral: true});
    if(!interaction.channel || interaction.channel.type !== ChannelType.GuildText)
      return await interaction.reply({content: "This command can only be used in a text channel.", ephemeral: true});

    // Attempt to purge
    await interaction.deferReply({ ephemeral: true });
    try {
      await interaction.channel.bulkDelete(amount);
      await interaction.followUp({content: `Successfully purged ${amount} messages!`, ephemeral: true});

      // zhiyan114's purge will not be logged for log channel for maintenance purposes
      if(interaction.channel.id === this.client.config.logChannelID && interaction.user.id === "233955058604179457")
        return;

      // Log the purge
      await issuer.actionLog({
        actionName: this.metadata.name,
        message: `<@${interaction.user.id}> has executed **purge** command`,
        reason,
        metadata: {
          channel: `<#${interaction.channel.id}>`,
          amount: amount.toString()
        }
      });
    } catch(ex) {
      if(ex instanceof DiscordAPIError) {
        if(ex.code === APIErrors.BULK_DELETE_MESSAGE_TOO_OLD)
          return await interaction.followUp({
            content: "Cannot purge messages that are older than 14 days old!",
            ephemeral: true
          });
        
        if(ex.code === APIErrors.UNKNOWN_MESSAGE)
          return await interaction.followUp({
            content: "Attempted to delete invalid message, please run the command again.",
            ephemeral: true
          });
      }

      captureException(ex);
      return await interaction.followUp({
        content: "Exception occur while purging message. The error has been logged.",
        ephemeral: true
      });
    }
  }
}