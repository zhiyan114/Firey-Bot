import type { GuildMember } from "discord.js";
import type { DiscordClient } from "../core/DiscordClient";
import { EmbedBuilder } from "discord.js";
import { schedule } from "node-cron";
import { captureCheckIn, captureException } from "@sentry/node-core";
import { createHash } from "crypto";
import { guildID } from "../config.json";


/**
 * Automatic unverified user kick (24-hrs kick)
 */

export class unverifyKickLoader {
  servicePrefix = "unverifyKick:";
  constructor(private client: DiscordClient) {
    this.client = client;
  }

  getRedisHash(id: string) {
    const memberHashID = createHash("sha256").update(id).digest("hex").slice(0,8);
    return `${this.servicePrefix}${memberHashID}`;
  }

  async load() {
    // Initial check and kick
    await this.checkAndKick();

    // Set grace period callback func
    this.client.on('guildMemberAdd', this.setGracePeriod.bind(this));

    // Set cronjob to check every 5 minutes
    schedule("*/5 * * * *", this.checkAndKick.bind(this));

  }

  // Callback function to set the user a grace period
  async setGracePeriod(member: GuildMember) {
    await this.client.redis.set(this.getRedisHash(member.id), "true", "EX", 86400);
  }

  // Check if users is no longer in grace period and kick
  async checkAndKick() {
    const checkInId = captureCheckIn({
      monitorSlug: "unverifykick-service",
      status: "in_progress",
    });
    let exeError = false;

    try {
      const guild = this.client.guilds.cache.get(guildID);
      if(!guild) throw Error("[Service unverifyKick]: Supplied guild ID is not valid");

      const noRoleUsers = (await guild.members.fetch())?.filter(m=>m.roles.cache.size === 1);
      if(noRoleUsers.size === 0) return;

      for(const [,member] of noRoleUsers) {
        if(await this.client.redis.get(this.getRedisHash(member.id)))
          continue;

        const embed = new EmbedBuilder()
          .setTitle("Kicked")
          .setDescription(`You have been automatically kicked from ${guild.name} for not confirming the rules within 24 hours. This system is implemented to prevent bot users from staying in the server. If you wish to stay, please rejoin using the same invite link and confirm the rules.`)
          .setColor("#FFFF00")
          .setFooter({ "text": "System Moderation" })
          .setTimestamp();
        await member.send({ embeds: [embed] });
        await member.kick("User remains unverified for at least 24 hours");

        await this.client.logger.sendLog({
          type: "Warning",
          message: `**${member.user.username}** have been kicked from the server for not confirming the rules within 24 hours`
        });
      }

    } catch(ex) {
      captureException(ex, {
        tags: { handled: "no" }
      });
      exeError = true;
    } finally {
      if(checkInId)
        captureCheckIn({
          monitorSlug: "unverifykick-service",
          status: exeError === true ? "error" : "ok",
          checkInId,
        });
    }
  }
}