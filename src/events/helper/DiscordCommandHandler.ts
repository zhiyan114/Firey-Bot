// This should handle all command callbacks and registerations

import { ChannelType, CommandInteraction, REST, Routes } from "discord.js";
import { banCommand } from "../../commands/discord";
import { baseCommand } from "../../core/baseCommand";
import { metrics } from "@sentry/node";
import { DiscordClient } from "../../core/DiscordClient";
import { createHash, timingSafeEqual } from "crypto";


export class DiscordCommandHandler {
  // I know, using object would be more efficient, but I doubt we're going to have more than 100 commands to scan through..
  private static commands = [
    new banCommand()
  ] satisfies baseCommand[];

  public static async commandRegister(client: DiscordClient) {
    if(!process.env["CLIENTID"])
      throw Error("Missing CLIENTID as env variable");

    // Check if the command is out-of-date
    const oldHash = await client.prisma.config.findUnique({
      where: {
        key: "command_hash"
      }
    });
    const currentHash = this.getCommandHash();
    if(oldHash && timingSafeEqual(Buffer.from(oldHash.value, 'base64'), currentHash))
      return;

    // Command out-of-date, register it
    await new REST({ version: "10" }).setToken(process.env["BOTTOKEN"]!)
      .put(
        Routes.applicationCommands(process.env["CLIENTID"]),
        {
          body: DiscordCommandHandler.commands.map(c=>c.metadata.toJSON())
        }
      );

    await client.prisma.config.upsert({
      where: {
        key: "command_hash"
      },
      create: {
        key: "command_hash",
        value: currentHash.toString("base64")
      },
      update: {
        value: currentHash.toString("base64")
      }
    });
  }   
    
  public static async commandEvent(client: DiscordClient, interaction: CommandInteraction): Promise<void> {
    // Get the command
    const command = this.commands.find(c=>c.metadata.name===interaction.commandName) as baseCommand | undefined;
    if(!command) return;

    // Check for access permission
    if(command) {
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

    // Execute command, assuming all the checks are passed (and track their usages)
    metrics.increment("discord.command.executed", 1, {
      timestamp: new Date().getTime(),
      tags: {
        command: interaction.commandName
      }
    });
    await command.execute(client, interaction);
  }

  public static getCommandHash(): Buffer {
    const hash = createHash("sha1");
    hash.update(JSON.stringify(this.commands));
    return hash.digest();
  }
}