import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Channel,
  ChannelType,
  ColorResolvable,
  CommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder
} from "discord.js";
import { baseCommand } from "../../core/baseCommand";
import { DiscordClient } from "../../core/DiscordClient";

export class EvalCommand extends baseCommand {
  public client: DiscordClient;
  public metadata = new SlashCommandBuilder()
    .setName("eval")
    .setDescription("Evaluates a code snippet for debugging purposes; Requires the highest privilege to run.")
    .setDMPermission(false)
    .addStringOption(option=>
      option.setName("code")
        .setDescription("The code to evaluate.")
        .setRequired(true)
    )
    .addBooleanOption(option=>
      option.setName("async")
        .setDescription("Whether to run the code in an asynchronous context.")
        .setRequired(true)
    );
  public access = {
    users: ['233955058604179457'],
    roles: [],
  };

  constructor(client: DiscordClient) {
    super();
    this.client = client;
  }

  public async execute(interaction: CommandInteraction) {
    const code = interaction.options.get("code", true).value as string;
    const isAsync = interaction.options.get("async", true).value as boolean;
    const channel = interaction.channel;
    const print = async (msg: unknown) => {
      if(typeof msg == "object") msg = JSON.stringify(msg);
      if(msg === undefined || msg === null) msg = "undefined";
      else msg = msg.toString();
      await channel?.send(msg as string);
    };

    await interaction.deferReply({ephemeral: true});
    try {
      const secureFunc = new Function(
        "client",
        "interaction",
        "channel",
        "guild",
        "member",
        "print",
        "utils",
        isAsync ? `return (async()=>{${code}})();` : code
      );

      let context = secureFunc(
        this.client,
        interaction,
        channel,
        interaction.guild,
        interaction.member,
        print,
        {
          createMissingUser: this.createMissingUser,
          updateUser: this.updateUser,
          createVeifyBtn: this.createVeifyBtn,
          sendEmbed: this.sendEmbed,
          getChannel: this.getChannel,
        }
      );

      if(context instanceof Promise)
        context = await context;
      return await interaction.followUp({content: `Execution complete! Context Returned: ${context}`, ephemeral: true});
    } catch(ex) {
      const err = ex as Error;
      await interaction.followUp({content: `Bad Execution [${err.name}]: \`${err.message}\``, ephemeral: true});
    }
  }

  /* Util commands for eval command runner */
  
  // Automatically add missing users to the database
  private createMissingUser = async (client: DiscordClient) => {
    const dataToPush: userDataType[] = [];
    const guild = client.guilds.cache.find(g=>g.id == client.config.guildID);
    if(!guild) return;
    for(const [,member] of await guild.members.fetch()) {
      if(member.user.bot) continue;
      const hasVerifyRole = member.roles.cache.find(role=>role.id == client.config.newUserRoleID);
      dataToPush.push({
        id: member.user.id,
        username: member.user.tag,
        rulesconfirmedon: hasVerifyRole ? (new Date()) : undefined
      });
    }
    await client.prisma.members.createMany({
      data: dataToPush,
      skipDuplicates: true,
    });
  };

  // Automatically update out-of-date user to the database
  private updateUser = async () => {
    const guild = this.client.guilds.cache.find(g=>g.id == this.client.config.guildID);
    if(!guild) return;

    for(const [,member] of await guild.members.fetch()) {
      if(member.user.bot) continue;
      await this.client.prisma.members.update({
        data: {
          username: member.user.username,
          displayname: member.user.displayName,
        },
        where: {
          id: member.user.id,
        }
      });
    }
  };

  // Create Verify Button
  private createVeifyBtn = async (channel: Channel) => {
    if(channel.type !== ChannelType.GuildText) return;

    const embed = new EmbedBuilder()
      .setTitle("Rule Verification")
      .setColor("#00FF00")
      .setDescription("Please press the **confirm** button below to confirm that you have read the rules above");
    const row = new ActionRowBuilder<ButtonBuilder>();
    row.addComponents(new ButtonBuilder()
      .setCustomId("RuleConfirm")
      .setLabel("Confirm")
      .setStyle(ButtonStyle.Success)
    );
    await channel.send({embeds:[embed], components:[row]});
  };

  // Send Embed Message on behalf of the bot lmao
  sendEmbed = async (channel: Channel, text: string, title?: string, color?: ColorResolvable) => {
    if(channel.type !== ChannelType.GuildText) return;
    const embed = new EmbedBuilder()
      .setTitle(title ?? null)
      .setColor(color ?? null)
      .setDescription(text);
    await channel.send({
      embeds: [embed]
    });
  };

  // Get channel object by channel ID
  getChannel = async(id: string) => {
    return await this.client.channels.fetch(id);
  };

}

type userDataType = {
  id: string,
  username: string,
  rulesconfirmedon: Date | undefined,
}