import { AttachmentBuilder, CommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { baseCommand } from "../../core/baseCommand";
import { DiscordClient } from "../../core/DiscordClient";
import { writeSnapshot } from "heapdump";
import { captureException } from "@sentry/node";
import { createGzip } from "zlib";
import { createReadStream, createWriteStream, unlinkSync, existsSync } from 'fs';
import { pipeline } from 'stream/promises';

export class heapDump extends baseCommand {
  client: DiscordClient;
  metadata = new SlashCommandBuilder();
  access = {
    users: ['233955058604179457'],
    roles: [],
  };
  
  constructor(client: DiscordClient) {
    super();
    this.client = client;
    this.metadata 
      .setName("heapdump")
      .setDescription("Request NodeJS Heap Dump (DevTool)");
  }

  async execute(interaction: CommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Write Dump
    const fileName = `heapdump-${Date.now()}.heapsnapshot`;
    writeSnapshot(fileName, async (err) => {
      if(err) {
        if(existsSync(fileName))
          unlinkSync(fileName);

        const id = captureException(err);
        return await interaction.followUp({
          content: `Failed to create heap dump. Check Sentry for more details. ID: ${id}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Compress the dump
      const outputName = `${fileName}.gz`;
      const gzip = createGzip({level: 9}); // Discord's disguesting 25 MB (10 now??) limit
      try {
        await pipeline(createReadStream(fileName), gzip, createWriteStream(outputName));
      } catch(ex) {
        if(existsSync(outputName))
          unlinkSync(outputName);

        const id = captureException(ex);
        return await interaction.followUp({
          content: `Failed to compress heap dump. Check Sentry for more details. ID: ${id}`,
          flags: MessageFlags.Ephemeral,
        });
      } finally {
        unlinkSync(fileName);
      }


      // Send dump and clean up
      await interaction.followUp({
        content: `Heap dump created successfully.`,
        flags: MessageFlags.Ephemeral,
        files: [new AttachmentBuilder(`./${outputName}`, { name: outputName })],
      });
      unlinkSync(outputName);


    });
  }
}