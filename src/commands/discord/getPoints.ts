import type { UserContextMenuCommandInteraction } from "discord.js";
import type { DiscordClient } from "../../core/DiscordClient";
import { ContextMenuCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
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
      .setType(2); // Workaround for ApplicationCommandType.User since it's throwing type error despite being correct??
  }

  public async execute(interaction: UserContextMenuCommandInteraction) {
    if(interaction.targetUser.bot)
      return await interaction.reply({ content: "Bots do not have points.", flags: MessageFlags.Ephemeral });
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Setup Embed
    const target = new DiscordUser(this.client, interaction.targetUser);
    const embed = new EmbedBuilder()
      .setTitle("Total Points")
      .setColor("#00FFFF")
      .setDescription((await target.getCacheData())?.points?.toString() ?? "-1")
      .setAuthor({ name: target.username, iconURL: interaction.targetUser.avatarURL() ?? interaction.targetUser.defaultAvatarURL })
      .setTimestamp();
    await interaction.followUp({ embeds:[embed], flags: MessageFlags.Ephemeral });
  }
}