import type { CommandInteraction, ModalSubmitInteraction } from "discord.js";
import type { DiscordClient } from "../../core/DiscordClient";
import {
  ActionRowBuilder,
  DiscordjsError,
  DiscordjsErrorCodes,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";

import { baseCommand } from "../../core/baseCommand";
import { randomUUID } from "crypto";
import { captureException, captureFeedback, suppressTracing } from "@sentry/node";

export class FeedbackCommand extends baseCommand {
  client: DiscordClient;
  metadata = new SlashCommandBuilder();
  access = {
    users: [],
    roles: [],
  };

  constructor(client: DiscordClient) {
    super();
    this.client = client;
    this.metadata
      .setName("feedback")
      .setDescription("Submit a general bug report or feedback about the bot")
      .addBooleanOption(opt=>
        opt.setName("dminquiry")
          .setDescription("Can the developer DM you for more details?")
          .setRequired(true)
      );

  }

  public async execute(interaction: CommandInteraction) {
    const modalID = randomUUID();
    const allowDevDM = interaction.options.get("dminquiry", true).value as boolean;

    // Create a modal box
    const modal = new ModalBuilder()
      .setCustomId(modalID)
      .setTitle("Feedback");

    // Let the user know if sentry caught the last error via description text
    const userSentryErrorID = await this.client.redis.get(`userSentryErrorID:${interaction.user.id}`) ?? undefined;

    // Create a text notice
    const sentryNotice = userSentryErrorID ?
      "Sentry did caught an error under your ID, so please use complete the field below instead!" :
      "For users who don't want a github account or issues captured by Sentry, complete the field below.";
    const noticeTextRow = new ActionRowBuilder<TextInputBuilder>()
      .addComponents(
        new TextInputBuilder()
          .setCustomId("notice")
          .setLabel("Notice")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(`Thank you for considering reporting the bug! Please use https://github.com/zhiyan114/Firey-Bot/issues if possible. ${sentryNotice} The form will expires in 10 minutes, so please complete it in a timely manner.`)
      );

    // Create a large text input
    const FeedbackTextRow = new ActionRowBuilder<TextInputBuilder>()
      .addComponents(
        new TextInputBuilder()
          .setCustomId("feedback")
          .setLabel("What should we change/fix?")
          .setStyle(TextInputStyle.Paragraph)
      );

    // Create a dropdown to ask the user whether the dev can DM them for more details...
    // @TODO: Pending discord new modal box features

    // Finalize and send
    modal.addComponents([
      noticeTextRow,
      FeedbackTextRow
    ]);
    await interaction.showModal(modal);

    await suppressTracing(async() =>{
      try {
        await this.processResult(await interaction.awaitModalSubmit({
          filter: (i) => i.customId === modalID && i.user.id === interaction.user.id,
          time: 600000
        }), allowDevDM, userSentryErrorID);
      } catch(ex) {
        if(ex instanceof DiscordjsError && ex.code === DiscordjsErrorCodes.InteractionCollectorError)
          return await interaction.followUp({ content: "You took too long to submit the request!", flags: MessageFlags.Ephemeral });
        captureException(ex);
      }
    });
  }

  private async processResult(result: ModalSubmitInteraction, allowDevDM: boolean, sentryEventID?: string) {
    const components = result.components.map(c=>c.components[0]);
    await result.reply({ content: "Thank you for submitting the feedback!", flags: MessageFlags.Ephemeral });
    captureFeedback({
      associatedEventId: sentryEventID,
      name: result.user.username,
      email: allowDevDM ? `${result.user.id}@discord.dm` : undefined,
      message: components.find(k=>k.customId === "feedback")?.value ?? "This shouldn't happened?!?!?",
    });
    if(sentryEventID)
      await this.client.redis.del(`userSentryErrorID:${result.user.id}`);
  }
}