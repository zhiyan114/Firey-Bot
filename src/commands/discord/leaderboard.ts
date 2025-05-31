import { CommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { DiscordClient } from "../../core/DiscordClient";
import { baseCommand } from "../../core/baseCommand";

type boardData = {
  username: string;
  points: number;
}

export class leaderboardCommand extends baseCommand {
  client: DiscordClient;
  metadata: SlashCommandBuilder;
  cacheKey = "disc:cmd:leaderboard";

  access = {
    users: [],
    roles: [],
  };

  constructor(client: DiscordClient) {
    super();
    this.client = client;
    this.metadata = new SlashCommandBuilder()
      .setName("leaderboard")
      .setDescription("Show the top ten points holder (cached for 30 minutes)");
  }
  public async execute(interaction: CommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const cacheData = await this.client.redis.get(this.cacheKey);
    let boardData: boardData[] = cacheData ? JSON.parse(cacheData) : [];

    if (boardData.length === 0) {
      // Pull from DB if cache is empty
      boardData = await this.client.prisma.members.findMany({
        select: {
          username: true,
          points: true
        },
        where: {
          username: {
            not: {
              contains: "Deleted Account"
            }
          }
        },
        orderBy: {
          points: 'desc'
        },
        take: 10
      });

      // Cache it for 30 minutes
      await this.client.redis.set(this.cacheKey, JSON.stringify(boardData), "EX", 1800);
    }

    // Format it to string
    const finalData = boardData
      .map((data, i)=>`${i+1}. **${data.username}** - ${data.points} points`)
      .join("\n\n");

    // Setup Embed and send it
    const embed = new EmbedBuilder()
      .setTitle("Global Leaderboard")
      .setDescription(finalData)
      .setColor("#00FFFF")
      .setTimestamp();
    await interaction.followUp({ embeds: [embed] });
  }
}