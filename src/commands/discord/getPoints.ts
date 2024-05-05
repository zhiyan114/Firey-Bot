import { ApplicationCommandType, ContextMenuCommandBuilder, EmbedBuilder, UserContextMenuCommandInteraction } from "discord.js";
import { DiscordClient } from "../../core/DiscordClient";
import { baseCommand } from "../../core/baseCommand";
import { DiscordUser } from "../../utils/DiscordUser";

export class getPointsCommand extends baseCommand {
  client: DiscordClient;
  metadata: ContextMenuCommandBuilder;
  access = {
    users: [],
    roles: [],
  };

  constructor(client: DiscordClient) {
    super();
    this.client = client;
    this.metadata = new ContextMenuCommandBuilder()
      .setName("getpoints")
      .setType(ApplicationCommandType.User);
  }

  public async execute(interaction: UserContextMenuCommandInteraction) {
    if(interaction.targetUser.bot)
      return await interaction.reply({content: "Bots do not have points.", ephemeral: true});
    await interaction.deferReply({ephemeral: true});

    // Setup Embed
    const target = new DiscordUser(this.client, interaction.targetUser);
    const embed = new EmbedBuilder()
      .setTitle("Total Points")
      .setColor("#00FFFF")
      .setDescription((await target.getCacheData())?.points?.toString() ?? "-1")
      .setAuthor({name: target.getUsername(), iconURL: interaction.targetUser.avatarURL() ?? interaction.targetUser.defaultAvatarURL})
      .setTimestamp();
    await interaction.followUp({embeds:[embed], ephemeral: true});
  }
}