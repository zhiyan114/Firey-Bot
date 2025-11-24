// MoneyPatch functions
import type { APIEmbed, Interaction, InteractionReplyOptions, MessageCreateOptions } from "discord.js";
import { EmbedBuilder, MessagePayload } from "discord.js";


export function moneyPatchReqID(interaction: Interaction, reqID: string) {
  // Content Patcher
  function patchContent(options: MessagePayload | MessageCreateOptions | InteractionReplyOptions) {
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
      // @ts-expect-error MoneyPatch
      options.embeds[0] = newEmbed;
      return;
    }
  }


  // Patch channel message
  if(interaction.channel?.isSendable()) {
    // Patch Send
    const oldSend = interaction.channel.send.bind(interaction.channel);
    // @ts-expect-error MoneyPatch
    interaction.channel.send = async (options: string | MessagePayload | MessageCreateOptions) => {
      if(typeof(options) === "string") {
        options += `\n\nRequest ID: ${reqID}`;
        return await oldSend(options);
      }

      patchContent(options);
      return await oldSend(options);
    };
  }

  // Patch interaction reply/followup stuff
  if(interaction.isCommand() || interaction.isUserContextMenuCommand()) {
    // eslint-disable-next-line
    const oldReply = interaction.reply.bind(interaction);
    // @ts-expect-error MoneyPatch
    // eslint-disable-next-line
    interaction.reply = async function(options: string | MessagePayload | InteractionReplyOptions) {
      if(typeof(options) === "string") {
        options += `\n\nRequest ID: ${reqID}`;
        return await oldReply(options);
      }

      patchContent(options);
      return await oldReply(options);
    };

    const oldFollowUp = interaction.followUp.bind(interaction);
    interaction.followUp = async function(options: string | MessagePayload | InteractionReplyOptions) {
      if(typeof(options) === "string") {
        options += `\n\nRequest ID: ${reqID}`;
        return await oldFollowUp(options);
      }

      patchContent(options);
      return await oldFollowUp(options);
    };
  }

  // Patch user message
  const oldUserSend = interaction.user.send.bind(interaction.user);
  interaction.user.send = async (options: string | MessagePayload | MessageCreateOptions) => {
    if(typeof(options) === "string") {
      options += `\n\nRequest ID: ${reqID}`;
      return await oldUserSend(options);
    }

    patchContent(options);
    return await oldUserSend(options);
  };
}