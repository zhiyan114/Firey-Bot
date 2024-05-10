import { ActionRowBuilder, CommandInteraction, GuildMember, ModalBuilder, ModalSubmitInteraction, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { DiscordClient } from "../../core/DiscordClient";
import { baseCommand } from "../../core/baseCommand";

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
      .setDMPermission(false);
  }
  public async execute(interaction: CommandInteraction) {
    if(!(interaction.member instanceof GuildMember)) return; // Not possible since the command usage is set disabled in DM
    await interaction.deferReply({ephemeral: true});
    const tUser = await this.client.prisma.twitch.findUnique({
      where: {
        memberid: interaction.user.id
      }
    });

    if(!tUser || !tUser.verified)
      return interaction.reply("You haven't linked your twitch account with your discord account yet! Use `!link [DiscordID]` on twitch chat to get started.");

    // create a modal box asking user for the input
    const modalBox = new ModalBuilder()
      .setCustomId("tbypass")
      .setTitle("Twitch Unfiltered Chat");

    // Textbox for the chat message
    const chatMessageAction = new ActionRowBuilder<TextInputBuilder>()
      .addComponents(
        new TextInputBuilder()
          .setCustomId(`chatMessage:${tUser.username}`)
          .setLabel("Message")
          .setPlaceholder("Type your message here (expire in 3 minutes)...")
          .setMinLength(1)
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(this.MaxMessageLength)
          .setRequired(true)
      );

    // Show the box to the user
    modalBox.addComponents(chatMessageAction);
    await interaction.showModal(modalBox);
    await this.processResult(await interaction.awaitModalSubmit({ filter: (i) => i.customId === "tbypass", time: 60000*3}));
  }

  private async processResult(result: ModalSubmitInteraction) {
    const components = result.components[0].components[0];
    const username = components.customId.split(":")[1];
    const message = components.value;

    await this.client.twitch.say(this.client.config.twitch.channel, `[@${username}]: ${message}`);
  }
}