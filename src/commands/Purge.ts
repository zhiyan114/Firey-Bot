/* Command Builder */
import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, BaseGuildTextChannel, TextChannel, DiscordAPIError } from "discord.js";
import { adminRoleID, logChannelID }  from "../config";
import { ICommand } from "../interface";
import { DiscordUser } from "../ManagerUtils/DiscordUser";
import {APIErrors} from "../utils/discordErrorCode";
import { captureException } from "@sentry/node";
const PurgeCmd = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Purge messages from a channel")
  .setDMPermission(false)
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


/* Function Builder */
const PurgeFunc = async (interaction : CommandInteraction) => {
  // Setup the inital
  if(!interaction.channel) return await interaction.reply("Interaction must be executed in a server");
  const amount = interaction.options.get("amount",true).value as number;
  if(amount <= 0 || amount > 100) return await interaction.reply({content: "Invalid amount!", ephemeral: true});

  // Get the option data
  const reason = interaction.options.get("reason", false)?.value as string | undefined;
  const User = new DiscordUser(interaction.user);
  await interaction.deferReply({ ephemeral: true });

  // Start the purge
  try {
    await (interaction.channel as BaseGuildTextChannel).bulkDelete(amount);
    await interaction.followUp({content: `Successfully purged ${amount} messages!`, ephemeral: true});
  } catch(ex) {
    if(ex instanceof DiscordAPIError && ex.code === APIErrors.BULK_DELETE_MESSAGE_TOO_OLD) return await interaction.followUp({
      content: "Cannot purge messages that are older than 14 days old",
      ephemeral: true
    });
    captureException(ex);
    return await interaction.followUp({
      content: "Exception occur while purging message. The error has been logged.",
      ephemeral: true
    });
  }
  

  // Log the purge (except if it's done by zhiyan114 in the logging channel for cleanup maintenance)
  if(interaction.channel.id === logChannelID && interaction.user.id === "233955058604179457") return;
  await User.actionLog({
    actionName: "purge",
    message: `<@${interaction.user.id}> has executed **purge** command`,
    reason,
    metadata: {
      channel: `<#${(interaction.channel as TextChannel).id}>`,
      amount: amount.toString()
    }
  });
};

export default {
  command: PurgeCmd,
  permissions: {
    roles: [adminRoleID]
  },
  function: PurgeFunc,
  disabled: false,
} as ICommand;