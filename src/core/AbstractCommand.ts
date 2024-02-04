import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export abstract class baseCommand {
    public abstract metadata: SlashCommandBuilder;
    public abstract execute: (interaction: CommandInteraction) => Promise<void>;
}