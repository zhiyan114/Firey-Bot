import { ChannelType, Interaction, Message } from "discord.js";
import { DiscordClient } from "../core/DiscordClient";
import { baseEvent } from "../core/baseEvent";
import { DiscordCommandHandler } from "./helper/DiscordCommandHandler";
import { VertificationHandler } from "./helper/DiscordConfirmBtn";
import { DiscordUser } from "../utils/DiscordUser";

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
}