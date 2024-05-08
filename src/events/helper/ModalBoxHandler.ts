import { ModalSubmitInteraction } from "discord.js";
import { DiscordClient } from "../../core/DiscordClient";

export class ModalBoxHandler {
  public static async handleFeedBackModal(client: DiscordClient, interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ephemeral: true});
    const userSentryErrorID = client.redis.GET(client.redisKey(`userSentryErrorID:${interaction.user.id}`));
    const components = interaction.components.map(k=>k.components[0]);
    const feedbackText = components.find(k=>k.customId==="feedbackModal_feedback")?.value;
    //@TODO: Pending discord new modal box features for dropdown options
    //@TODO: Pending sentry new user feedback feature
    if(!feedbackText) return;
    await interaction.followUp({content: "Thank you for your feedback! We will look into it as soon as possible."});
  }
}