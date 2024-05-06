// This should handle all command callbacks and registerations

import { ChannelType, CommandInteraction, ContextMenuCommandInteraction, REST, Routes } from "discord.js";
import { EvalCommand, banCommand, getPointsCommand, kickCommand, leaderboardCommand, purgeCommand, softBanCommand, unbanCommand } from "../../commands/discord";
import { baseCommand } from "../../core/baseCommand";
import { metrics } from "@sentry/node";
import { DiscordClient } from "../../core/DiscordClient";
import { createHash, timingSafeEqual } from "crypto";


export class DiscordCommandHandler {
  // I know, using object would be more efficient, but I doubt we're going to have more than 100 commands to scan through..
  private commands: baseCommand[];
  private client: DiscordClient;

  constructor(client: DiscordClient) {
    this.client = client;
    // @NOTE: Add all enabled commands here
    this.commands = [
      new banCommand(client),
      new EvalCommand(client),
      new getPointsCommand(client),
      new kickCommand(client),
      new leaderboardCommand(client),
      new purgeCommand(client),
      new softBanCommand(client),
      new unbanCommand(client)
    ] satisfies baseCommand[];
  }

  public async commandRegister() {
    if(!process.env["CLIENTID"])
      throw Error("Missing CLIENTID as env variable");

    // Check if the command is out-of-date
    const oldHash = await this.client.prisma.config.findUnique({
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
          body: this.commands.map(c=>c.metadata.toJSON())
        }
      );

    await this.client.prisma.config.upsert({
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
    await this.client.logger.sendLog({
      type: "Info",
      message: "Application Command has been updated!"
    });
  }   
    
  public async commandEvent(interaction: CommandInteraction | ContextMenuCommandInteraction): Promise<void> {
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

    // Execute command, assuming all the checks are passed (and track their usages)
    metrics.increment("discord.command.executed", 1, {
      timestamp: new Date().getTime(),
      tags: {
        command: interaction.commandName,
        type: interaction instanceof CommandInteraction ? "slash" : "context"
      }
    });
    await command.execute(interaction);
  }

  public getCommandHash(): Buffer {
    const hash = createHash("sha1");
    hash.update(this.commands.map(k=> k.metadata.toJSON()).join());
    return hash.digest();
  }
}