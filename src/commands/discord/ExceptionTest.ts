import { type CommandInteraction, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { baseCommand } from "../../core/baseCommand";
import type { DiscordClient } from "../../core/DiscordClient";
import { captureException } from "@sentry/node";

export class ThrowError extends baseCommand {
  public client: DiscordClient;
  public metadata = new SlashCommandBuilder()
    .setName("eval")
    .setDescription("Evaluates a code snippet for debugging purposes (DevTool)")
    .setContexts([InteractionContextType.Guild])
    .addBooleanOption(option=>
      option.setName("caught")
        .setDescription("Whether the exception is caught by sentry or not.")
        .setRequired(true)
    );

  public access = {
    users: ['233955058604179457'],
    roles: [],
  };

  constructor(client: DiscordClient) {
    super();
    this.client = client;
  }

  private badFunction() {
    throw new Error("The evil is here >:3");
  }

  public async execute(interaction: CommandInteraction) {
    await interaction.reply({ content: "Error should be thrown now", flags: MessageFlags.Ephemeral });
    const isCaught = interaction.options.get("caught", true).value as boolean;

    if(isCaught)
      return captureException(this.badFunction());
    return this.badFunction();
  }
}