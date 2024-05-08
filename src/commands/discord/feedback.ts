import { CommandInteraction, ModalBuilder, SlashCommandBuilder } from "discord.js";
import { DiscordClient } from "../../core/DiscordClient";
import { baseCommand } from "../../core/baseCommand";

export class feedbackCommand extends baseCommand {
  client: DiscordClient;
  metadata: SlashCommandBuilder;
  access = {
    users: [],
    roles: [],
  };
  
  constructor(client: DiscordClient) {
    super();
    this.client = client;
    this.metadata = new SlashCommandBuilder()
      .setName("feedback")
      .setDescription("Submit a general bug report or feedback about the bot");

  }
  
  public async execute(interaction: CommandInteraction) {
    // Create a modal box
    new ModalBuilder()
      .setCustomId("feedbackModal")
      .setTitle("Feedback");
    
  }
}