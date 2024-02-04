// This should handle all command callbacks and registerations

import { ChannelType, CommandInteraction, REST, Routes } from "discord.js";
import { banCommand } from "../commands/discord";
import { baseCommand } from "../core/baseCommand";


export class DiscordCommandHandler {
  // I know, using object would be more efficient, but I doubt we're going to have more than 100 commands to scan through..
  private static commands = [
    new banCommand()
  ];

  public static async commandRegister() {
    // @TODO: Implement a check to ensure command is out of date before registering
    if(!process.env["CLIENTID"])
      throw Error("Missing CLIENTID as env variable");

    // Assume the command is out of date, and register all the commands
    new REST({ version: "10" }).setToken(process.env["BOTTOKEN"]!)
      .put(
        Routes.applicationCommands(process.env["CLIENTID"]),
        {
          body: DiscordCommandHandler.commands.map(c=>c.metadata.toJSON())
        }
      );

  }   
    
  public static async commandEvent(interaction: CommandInteraction): Promise<void> {
    // Get the command
    const command = this.commands.find(c=>c.metadata.name===interaction.commandName) as baseCommand | undefined;
    if(!command) return;

    // Check for access permission
    if(command.access) {
      // User ID Check
      if(command.access.users && command.access.users.length > 0 && !command.access.users.includes(interaction.user.id)) {
        await interaction.reply({content: "You do not have permission to use this command.", ephemeral: true});
        return;
      }

      // Role Check
      if(command.access.roles && command.access.roles.length > 0 && interaction.channel?.type !== ChannelType.DM) {
        const member = interaction.guild?.members.cache.get(interaction.user.id);
        if(!member) return;
        if(!member.roles.cache.some(r=>command.access?.roles?.includes(r.id))) {
          await interaction.reply({content: "You do not have permission to use this command.", ephemeral: true});
          return;
        }
      }

    }

    // Execute command, assuming all the checks are passed
    await command.execute(interaction);
  }
}