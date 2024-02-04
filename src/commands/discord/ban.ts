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
    await interaction.reply("Placeholder implementation.");
  }

}