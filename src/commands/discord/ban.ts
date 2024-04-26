import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { baseCommand } from "../../core/baseCommand";

export class banCommand extends baseCommand {
  public metadata = new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bans the target user.")
    .setDMPermission(false)
    .addUserOption(option =>
      option.setName("user")
        .setDescription("The user to ban.")
        .setRequired(true)
    )
    .addStringOption(option=>
      option.setName("reason")
        .setDescription("The reason for the ban, user will see this.")
        .setRequired(true)
    )
    .addBooleanOption(option=>
      option.setName("delete")
        .setDescription("Delete all messages from the user banned user.")
        .setRequired(true)
    );

  public access = {
    users: [],
    roles: [],
  };

  public async execute(interaction: CommandInteraction) {
    // Validation Checks
    if(!interaction.guild) return await interaction.reply("Interaction must be executed in a server");
    const targetMember = interaction.options.getMember("user") as GuildMember | null;
    if(!targetMember) return await interaction.reply("Invalid User has been supplied");

    // Get the supplied data
    const reason = interaction.options.get("reason",true).value as string;
    const deleteMessages = interaction.options.get("delete",true).value as boolean;
    const targetUser = new DiscordUser(targetMember.user);
    const issuerUser = new DiscordUser(interaction.user);
    await interaction.deferReply({ephemeral: true});

    // Notify and ban the user
    await targetUser.sendMessage({
      title: "Banned",
      color: "#ff0000",
      message: `You have been banned from ${interaction.guild.name}!`,
      fields: [
        {
          name: "Reason",
          value: reason
        },
        {
          name: "Banned By",
          value: issuerUser.getUsername()
        }
      ]
    });
    await targetMember.ban({
      reason,
      deleteMessageSeconds: deleteMessages ? 604800 : undefined
    });

    // Log the action and wrap up
    await issuerUser.actionLog({
      actionName: "ban",
      target: targetUser,
      message: `<@${targetMember.id}> has been banned by <@${interaction.user.id}>`,
      reason
    });
    await interaction.followUp({content: "User has been successfully banned!", ephemeral: true});
  }

}