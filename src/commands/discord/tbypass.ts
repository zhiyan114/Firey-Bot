import type { ChatInputCommandInteraction, ModalSubmitInteraction } from "discord.js";
import type { DiscordClient } from "../../core/DiscordClient";
import {
  ActionRowBuilder,
  ComponentType,
  DiscordjsError,
  DiscordjsErrorCodes,
  GuildMember,
  InteractionContextType,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import { baseCommand } from "../../core/baseCommand";
import { randomUUID } from "crypto";
import { captureException } from "@sentry/node-core";

export class TwitchChatRelay extends baseCommand {
  public client: DiscordClient;
  public metadata = new SlashCommandBuilder();
  private MaxMessageLength = 470;
  public access = {
    users: [],
    roles: ["907769458670575658"],
  };

  constructor(client: DiscordClient) {
    super();
    this.client = client;
    this.access.roles.push(client.config.adminRoleID);
    this.metadata
      .setName("tbypass")
      .setDescription("Send an unfiltered message on twitch chat (via bot account).")
      .setContexts([InteractionContextType.Guild]);
  }

  public async execute(interaction: ChatInputCommandInteraction) {
    if(!(interaction.member instanceof GuildMember)) return; // Not possible since the command usage is set disabled in DM
    const uniqueID = randomUUID();

    const tUser = await this.client.prisma.twitch.findUnique({
      select: {
        verified: true,
        username: true,
      },
      where: {
        memberid: interaction.user.id
      }
    });
    if(!tUser || !tUser.verified)
      return interaction.reply("You haven't linked your twitch account with your discord account yet! Use `!link [DiscordID]` on twitch chat to get started.");
    // create a modal box asking user for the input

    const modalBox = new ModalBuilder()
      .setCustomId(uniqueID)
      .setTitle("Twitch Unfiltered Chat");

    // Textbox for the chat message
    const chatMessageAction = new ActionRowBuilder<TextInputBuilder>()
      .addComponents(
        new TextInputBuilder()
          .setCustomId(`chatMessage`)
          .setLabel("Message")
          .setPlaceholder("Type your message here (expire in 5 minutes)...")
          .setMinLength(1)
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(this.MaxMessageLength)
          .setRequired(true)
      );

    // Show the box to the user
    modalBox.addComponents(chatMessageAction);
    await interaction.showModal(modalBox);

    try {
      await this.processResult(await interaction.awaitModalSubmit({
        filter: (i) => i.customId === uniqueID && i.user.id === interaction.user.id,
        time: 300000
      }), tUser.username);
    } catch(ex) {
      if(ex instanceof DiscordjsError && ex.code === DiscordjsErrorCodes.InteractionCollectorError)
        return await interaction.followUp({ content: "You took too long to submit the request!", flags: MessageFlags.Ephemeral });
      captureException(ex);
    }
  }

  private async processResult(result: ModalSubmitInteraction, username: string) {
    const components = result.components[0].type === ComponentType.ActionRow && result.components[0].components[0];
    const message = (components !== false) ? components.value : "Invalid Component found in code";

    await this.client.twitch.say(this.client.config.twitch.channel, `[@${username}]: ${message}`);
    await result.reply({ content: "Message Sent!", flags: MessageFlags.Ephemeral });
  }
}