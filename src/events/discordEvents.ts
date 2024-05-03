import { ChannelType, DiscordAPIError, EmbedBuilder, GuildMember, Interaction, Message } from "discord.js";
import { DiscordClient } from "../core/DiscordClient";
import { baseEvent } from "../core/baseEvent";
import { DiscordCommandHandler } from "./helper/DiscordCommandHandler";
import { VertificationHandler } from "./helper/DiscordConfirmBtn";
import { DiscordUser } from "../utils/DiscordUser";
import { APIErrors } from "../utils/discordErrorCode";
import { captureException } from "@sentry/node";
import { BannerPic } from "../utils/bannerGen";

export class DiscordEvents extends baseEvent {
  client: DiscordClient;
  constructor(client: DiscordClient) {
    super();
    this.client = client;
  }

  public registerEvents() {
    this.client.on("ready", this.onReady.bind(this));
    this.client.on("interactionCreate", this.createCommand.bind(this));
    this.client.on("messageCreate", this.messageCreate.bind(this));
    this.client.on("guildMemberAdd", this.guildMemberAdd.bind(this));
  }

  private async onReady() {
    console.log(`Logged in as ${this.client.user?.tag}!`);
    await this.client.logger.initalize();
    await this.client.logger.sendLog({
      type: "Info",
      message: "Discord.js client has been initialized!"
    });
    this.client.updateStatus();
  }

  private async createCommand(interaction: Interaction) {
    if(interaction.isCommand())
      DiscordCommandHandler.commandEvent(this.client, interaction);

    if(interaction.isButton())
      if(interaction.customId === "RuleConfirm")
        VertificationHandler(this.client, interaction);
  }

  private async messageCreate(message: Message) {
    if(message.author.bot) return;
    if(message.channel.type !== ChannelType.GuildText) return;
    if(this.client.config.noPointsChannel.find(c=>c===message.channel.id)) return;

    // Grant points
    await (new DiscordUser(this.client, message.author)).economy.chatRewardPoints(message.content);
  }

  private async guildMemberAdd(member: GuildMember) {
    if(member.user.bot) return;
    const user = new DiscordUser(this.client, member.user);
    const channel = await this.client.channels.fetch(this.client.config.welcomeChannelID);
    if(!channel || channel.type !== ChannelType.GuildText) return;

    // Send welcome message to user
    const embed = new EmbedBuilder()
      .setColor("#00FFFF")
      .setTitle("Welcome to the server!")
      .setDescription(`Welcome to the Derg server, ${member.user.username}! Please read the rules and press the confirmation button to get full access.`);
    try {
      await member.send({embeds: [embed]});
    } catch(ex) {
      if(ex instanceof DiscordAPIError && ex.code === APIErrors.CANNOT_MESSAGE_USER)
        await channel.send({content:`||<@${member.user.id}> You've received this message here because your DM has been disabled||`, embeds: [embed]});
      else captureException(ex);
    }
    
    this.client.updateStatus();

    // Send a welcome banner
    const BannerBuff = await (new BannerPic()).generate(user.getUsername(), member.user.displayAvatarURL({size: 512}));
    await channel.send({files: [BannerBuff]});
  }
}