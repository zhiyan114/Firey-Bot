import { CommandInteraction, EmbedBuilder, InteractionContextType, SlashCommandBuilder } from "discord.js";
import { baseCommand } from "../../core/baseCommand";
import { DiscordClient } from "../../core/DiscordClient";
import { TwitchUser } from "../../utils/TwitchUser";

export class TwitchVerify extends baseCommand {
  client: DiscordClient;
  metadata = new SlashCommandBuilder();
  access = {
    users: [],
    roles: [] as string[],
  };

  constructor(client: DiscordClient) {
    super();
    this.client = client;
    this.metadata
      .setName("tverify")
      .setDescription("Verify your Twitch account")
      .setContexts([InteractionContextType.Guild])
      .addStringOption(option =>
        option.setName("username")
          .setDescription("Your Twitch Username")
          .setRequired(true)
      );
  }

  public async execute(interaction: CommandInteraction) {
    const twitchUsername = interaction.options.get("username", true).value as string;
    await interaction.deferReply({ephemeral: true});
    const embed = new EmbedBuilder()
      .setTitle("Link Twitch Account")
      .setFooter({text: "Twitch Linking System"})
      .setTimestamp();

    // Check for the request and status
    const userReq = await this.client.prisma.twitch.findUnique({
      select: {
        id: true,
        username: true,
        verified: true,
      },
      where: {
        memberid: interaction.user.id,
        username: twitchUsername,
      }
    });
    if(!userReq)
      return await interaction.followUp({
        embeds:[
          embed
            .setDescription(`No verification request for this username has been found under your account's ID. Please go on Firey's twitch chat and run the command: \`!link ${interaction.user.id}\` to get started.`)
            .setColor("#FF0000")
        ], ephemeral: true
      });
    if(userReq.verified)
      return await interaction.followUp({
        embeds:[
          embed
            .setDescription(`Your account has already been verified, if this is a mistake, please contact zhiyan114.`)
            .setColor("#FFFF00")
        ], ephemeral: true
      });

    // Process the request
    await this.client.prisma.twitch.update({
      where: {
        id: userReq.id
      },
      data: {
        verified: true
      }
    });
    await (new TwitchUser(this.client, userReq.id)).updateDataCache({
      memberid: interaction.user.id,
      username: userReq.username,
      verified: true
    });
    return await interaction.followUp({
      embeds:[
        embed
          .setDescription(`Your twitch account has been successfully verified, please contact zhiyan114 if you need it changed in the future.`)
          .setColor("#00FF00")
      ], ephemeral: true
    });
  }

}