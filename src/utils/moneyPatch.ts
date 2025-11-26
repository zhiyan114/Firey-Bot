// MonkeyPatch functions
import { getCurrentScope, getIsolationScope } from "@sentry/node-core";
import type {
  APIEmbed,
  APIModalInteractionResponseCallbackData,
  Interaction,
  InteractionReplyOptions,
  JSONEncodable,
  MessageCreateOptions,
  ModalComponentData,
  ShowModalOptions
} from "discord.js";
import {
  EmbedBuilder,
  MessagePayload,
  ModalBuilder,
  TextDisplayBuilder
} from "discord.js";


export function MonkeyPatchReqID(interaction: Interaction, reqID?: string) {
  reqID = reqID ??
    getCurrentScope().getScopeData().tags["requestID"]?.toString() ??
    getCurrentScope().getScopeData().attributes?.["requestID"]?.toString() ??
    getIsolationScope().getScopeData().tags["requestID"]?.toString() ??
    getIsolationScope().getScopeData().attributes?.["requestID"]?.toString();
  if(!reqID)
    throw new Error("MonkeyPatchReqID: Cannot patch with missing requestID");
  // Content Patcher
  function patchContent(options: MessagePayload | MessageCreateOptions | InteractionReplyOptions) {
    if(!reqID) return; // Control Flow

    if(options instanceof MessagePayload) {
      // Do something in the future when used
      return;
    }

    if(options.content) {
      options.content += `\n\nRequest ID: ${reqID}`;
      return;
    }
    if(options.embeds && options.embeds.length > 0) {
      const newEmbed = new EmbedBuilder(options.embeds[0] as APIEmbed);
      newEmbed.addFields({ name: "Request ID", value: reqID });
      // @ts-expect-error MonkeyPatch
      options.embeds[0] = newEmbed;
      return;
    }
  }


  // Patch channel message
  if(interaction.channel?.isSendable()) {
    // Patch Send
    const oldSend = interaction.channel.send;
    interaction.channel.send = async (options: string | MessagePayload | MessageCreateOptions) => {
      if(typeof(options) === "string") {
        options += `\n\nRequest ID: ${reqID}`;
        // @ts-expect-error MonkeyPatch
        return await oldSend.call(interaction.channel, options);
      }

      patchContent(options);
      // @ts-expect-error MonkeyPatch
      return await oldSend.call(interaction.channel, options);
    };
  }

  // Patch interaction reply/followup stuff
  if(interaction.isCommand() || interaction.isUserContextMenuCommand()) {
    // eslint-disable-next-line
    const oldReply = interaction.reply;
    // @ts-expect-error MonkeyPatch
    // eslint-disable-next-line
    interaction.reply = async function(options: string | MessagePayload | InteractionReplyOptions) {
      if(typeof(options) === "string") {
        options += `\n\nRequest ID: ${reqID}`;
        return await oldReply.call(interaction, options);
      }

      patchContent(options);
      return await oldReply.call(interaction, options);
    };

    const oldFollowUp = interaction.followUp;
    interaction.followUp = async function(options: string | MessagePayload | InteractionReplyOptions) {
      if(typeof(options) === "string") {
        options += `\n\nRequest ID: ${reqID}`;
        return await oldFollowUp.call(interaction, options);
      }

      patchContent(options);
      return await oldFollowUp.call(interaction, options);
    };

    // Patch Modal box
    const oldShowModal = interaction.showModal;
    // @ts-expect-error MonkeyPatch
    interaction.showModal = async function(modal: JSONEncodable<APIModalInteractionResponseCallbackData> | ModalComponentData | APIModalInteractionResponseCallbackData, options?: ShowModalOptions & { withResponse: true;}) {
      // @ts-expect-error MonkeyPatch
      const newModal = new ModalBuilder(modal.toJSON ? modal.toJSON() : modal);

      // Add reqID label at the end of the modal
      newModal.addTextDisplayComponents(
        new TextDisplayBuilder()
          .setId(99999) // last order ig
          .setContent(`Request ID: ${reqID}`)
      );

      return await oldShowModal.call(interaction, newModal, options);
    };
  }

  // Patch user message
  const oldUserSend = interaction.user.send;
  interaction.user.send = async (options: string | MessagePayload | MessageCreateOptions) => {
    if(typeof(options) === "string") {
      options += `\n\nRequest ID: ${reqID}`;
      return await oldUserSend.call(interaction.user, options);
    }

    patchContent(options);
    return await oldUserSend.call(interaction.user, options);
  };

}