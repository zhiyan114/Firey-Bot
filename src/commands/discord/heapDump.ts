import type { CommandInteraction, InteractionReplyOptions } from "discord.js";
import type { DiscordClient } from "../../core/DiscordClient";
import { AttachmentBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { baseCommand } from "../../core/baseCommand";
import { writeSnapshot } from "heapdump";
import { captureException, captureMessage, withScope } from "@sentry/node";
import { createGzip } from "zlib";
import { createReadStream, createWriteStream, unlinkSync, existsSync, statSync, readFileSync } from 'fs';
import { pipeline } from 'stream/promises';
import { totalmem } from "os";

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
    await withScope(async (scope) => {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // HeapDump requires x2 the memory of the current heap size
      const rssSize = process.memoryUsage().rss;
      const sysMemCount = process.constrainedMemory() || totalmem();
      if(sysMemCount < rssSize * 2.25) // x1.25 multiplier for safety
        return await interaction.followUp({
          content: `Not enough memory to create heap dump. Total memory: ${Math.round(sysMemCount / 1024 / 1024)} MB,  Mem Usage: ${Math.round(rssSize / 1024 / 1024)} MB`,
          flags: MessageFlags.Ephemeral,
        });

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
        const gzip = createGzip({ level: 9 }); // Discord's disguesting 25 MB (10 now??) limit
        try {
          await pipeline(createReadStream(fileName), gzip, createWriteStream(outputName));
        } catch(ex) {
          // Upload uncompressed dump to sentry as backup (< 100 MB sentry limit)
          if(statSync(fileName).size < 100 * 1024 * 1024)
            scope.addAttachment({
              data: readFileSync(fileName),
              filename: fileName,
            });
          const id = captureException(ex);
          scope.clearAttachments();

          await interaction.followUp({
            content: `Failed to compress heap dump. Check Sentry for more details. ID: ${id}`,
            flags: MessageFlags.Ephemeral,
          });

          if(existsSync(outputName))
            unlinkSync(outputName);
          return;
        } finally {
          unlinkSync(fileName);
        }


        // Send dump to appropriate place and clean up
        const followUpData = {
          content: `Heap dump created successfully.`,
          flags: MessageFlags.Ephemeral,
          files: [] as AttachmentBuilder[],
        } satisfies InteractionReplyOptions;

        const fileSize = statSync(fileName).size;
        if(fileSize < 25 * 1024 * 1024) {
          // Discord Attachment
          followUpData.files.push(new AttachmentBuilder(`./${outputName}`, { name: outputName }));
        } else if(fileSize < 100 * 1024 * 1024) {
          // Sentry Attachment
          scope.addAttachment({
            data: readFileSync(outputName),
            filename: outputName,
          });
          const id = captureMessage("Heap dump requested by a developer", { level: "debug" });
          scope.clearAttachments();

          followUpData.content += ` Heap dump exceeded discord attachment limit, uploading to Sentry instead. ID: ${id}`;
        } else {
          // Neither works... Might implement CloudFlare R2 for this case...
          followUpData.content += ` Heap dump exceeded both discord and sentry attachment limits. ! Consider CF R2 Solution !`;
        }

        await interaction.followUp(followUpData);
        unlinkSync(outputName);
      });

    });
  }
}