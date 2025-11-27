// MonkeyPatch DiscordJS Request ID
import { getCurrentScope, getIsolationScope } from "@sentry/node-core";
import type {
  APIEmbed,
  APIModalInteractionResponseCallbackData,
  Channel,
  Interaction,
  InteractionReplyOptions,
  JSONEncodable,
  MessageCreateOptions,
  ModalComponentData,
  ShowModalOptions,
  User
} from "discord.js";
import {
  EmbedBuilder,
  MessagePayload,
  ModalBuilder,
  TextDisplayBuilder
} from "discord.js";

// Content Patcher
function patchContent(options: MessagePayload | MessageCreateOptions | InteractionReplyOptions, reqID: string) {
  // Might be right, but no guarantee... Should write a test for this :pensive:
  const newOpt = (options instanceof MessagePayload) ? options.options : options;

  if(newOpt.content && !newOpt.embeds) {
    const addContent = `\n\nRequest ID: ${reqID}`;
    if(newOpt.content.length+addContent.length <= 2000)
      newOpt.content += addContent;
  }

  if(newOpt.embeds && newOpt.embeds.length > 0) {
    const oldEmbed = newOpt.embeds[0];
    const newEmbed = new EmbedBuilder(("toJSON" in oldEmbed) ? oldEmbed.toJSON() : oldEmbed);

    if((newEmbed.toJSON().fields?.length ?? 0) < 25)
      newEmbed.addFields({ name: "Request ID", value: reqID });
    (newOpt.embeds[0] as JSONEncodable<APIEmbed> | APIEmbed) = newEmbed;
  }

  if(options instanceof MessagePayload)
    options.body = options.resolveBody().body;
}

export function getReqIDFromScope() {
  const currentScope = getCurrentScope().getScopeData();
  const isolationScope = getIsolationScope().getScopeData();

  return currentScope.tags["requestID"]?.toString() ??
    currentScope.attributes?.["requestID"]?.toString() ??
    isolationScope.tags["requestID"]?.toString() ??
    isolationScope.attributes?.["requestID"]?.toString();
}

export function patchAllInteraction(interaction: Interaction, reqID?: string) {
  reqID = reqID ?? getReqIDFromScope();
  if(!reqID)
    throw new Error("patchAllInteraction: Cannot patch with missing requestID");

  showModalPatch(interaction, reqID);
  replyPatch(interaction, reqID);
  followUpPatch(interaction, reqID);
}

export function showModalPatch(interaction: Interaction, reqID: string) {
  if(!("showModal" in interaction)) return;
  const oldShowModal = interaction.showModal;

  // @ts-expect-error MonkeyPatch
  interaction.showModal = async function(modal: JSONEncodable<APIModalInteractionResponseCallbackData> | ModalComponentData | APIModalInteractionResponseCallbackData, options?: ShowModalOptions & { withResponse: true;}) {
    const newModal = new ModalBuilder(("toJSON" in modal) ? modal.toJSON() : modal);

    // Add reqID label at the end of the modal
    newModal.addTextDisplayComponents(
      new TextDisplayBuilder()
        .setId(99999) // last order ig
        .setContent(`Request ID: ${reqID}`)
    );

    return await oldShowModal.call(interaction, newModal, options);
  };
}

export function followUpPatch(interaction: Interaction, reqID: string) {
  if(!interaction.isRepliable()) return;
  const oldFollowUp = interaction.followUp;

  interaction.followUp = async function(options: string | MessagePayload | InteractionReplyOptions) {
    if(typeof(options) === "string") {
      const newContent = `\n\nRequest ID: ${reqID}`;
      if(options.length + newContent.length <= 2000)
        options += newContent;
      return await oldFollowUp.call(interaction, options);
    }

    patchContent(options, reqID);
    return await oldFollowUp.call(interaction, options);
  };
}

export function replyPatch(interaction: Interaction, reqID: string) {
  if(!interaction.isRepliable()) return;

  // eslint-disable-next-line
  const oldReply = interaction.reply;

  // @ts-expect-error MonkeyPatch
  // eslint-disable-next-line
  interaction.reply = async function(options: string | MessagePayload | InteractionReplyOptions) {
    if(typeof(options) === "string") {
      const newContent = `\n\nRequest ID: ${reqID}`;
      if(options.length + newContent.length <= 2000)
        options += newContent;
      return await oldReply.call(interaction, options);
    }

    patchContent(options, reqID);
    return await oldReply.call(interaction, options);
  };
}

export function userPatch(user: User & {isPatched?: boolean}, reqID: string) {
  if(user.isPatched) return;
  user.isPatched = true;

  const oldUserSend = user.send;
  user.send = async (options: string | MessagePayload | MessageCreateOptions) => {
    // Unpatch OP
    if(!user.isPatched) {
      user.send = oldUserSend;
      delete user.isPatched;
      return await oldUserSend.call(user, options);
    }

    if(typeof(options) === "string") {
      const newContent = `\n\nRequest ID: ${reqID}`;
      if(options.length + newContent.length <= 2000)
        options += newContent;
      return await oldUserSend.call(user, options);
    }

    patchContent(options, reqID);
    return await oldUserSend.call(user, options);
  };
}

export function channelPatch(channel: Channel & {isPatched?: boolean}, reqID: string) {
  if(channel.isPatched) return;
  if(!channel?.isSendable()) return;
  channel.isPatched = true;

  const oldSend = channel.send;
  channel.send = async (options: string | MessagePayload | MessageCreateOptions) => {
    // Unpatch OP
    if(!channel.isPatched) {
      channel.send = oldSend;
      delete channel.isPatched;
      // @ts-expect-error MonkeyPatch
      return await oldSend.call(channel, options);
    }

    if(typeof(options) === "string") {
      const newContent = `\n\nRequest ID: ${reqID}`;
      if(options.length + newContent.length <= 2000)
        options += newContent;
      // @ts-expect-error MonkeyPatch
      return await oldSend.call(interaction.channel, options);
    }

    patchContent(options, reqID);
    // @ts-expect-error MonkeyPatch
    return await oldSend.call(interaction.channel, options);
  };
}

// Doesn't make sense to unpatch interaction as they're a throwaway class anyway...
export function unpatch(object: (Channel | User) & {isPatched?: boolean}) {
  // send functions will do a self-clean up and revert the class back to its original state when it gets called again
  object.isPatched = false;
}