import { ActionRowBuilder, CommandInteraction, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { DiscordClient } from "../../core/DiscordClient";
import { baseCommand } from "../../core/baseCommand";

export class FeedbackCommand extends baseCommand {
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
    const modal = new ModalBuilder()
      .setCustomId("feedbackModal")
      .setTitle("Feedback");

    
    // Let the user know if sentry caught the last error via description text
    const lastUserSentryErrorID = this.client.redis.GET(this.client.redisKey(`userSentryErrorID:${interaction.user.id}`));

    // Create a description text, describing the feedback box and when to submit one on the bot's github repo page instead.
    // @TODO: Pending discord new modal box features

    // Create a large text input
    const FeedbackTextRow = new ActionRowBuilder<TextInputBuilder>()
      .addComponents(
        new TextInputBuilder()
          .setCustomId("feedbackModal_feedback")
          .setLabel("What should we change/fix?")
          .setStyle(TextInputStyle.Paragraph)
      );

    // Create a dropdown to ask the user whether the dev can DM them for more details...
    // @TODO: Pending discord new modal box features

    // Finalize and send
    modal.addComponents([
      FeedbackTextRow
    ]);
    return await interaction.showModal(modal);
    
  }
}