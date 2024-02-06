import { Interaction } from "discord.js";
import { DiscordClient } from "../core/DiscordClient";
import { baseEvent } from "../core/baseEvent";
import { DiscordCommandHandler } from "../services/DiscordCommandHandler";

export class DiscordEvents extends baseEvent {
  client: DiscordClient;
  constructor(client: DiscordClient) {
    super();
    this.client = client;
  }

  public registerEvents() {
    this.client.on("ready", this.onReady.bind(this));
    this.client.on("interactionCreate", this.createCommand.bind(this));
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
      DiscordCommandHandler.commandEvent(interaction);
  }
}