/**
* Points reward system for voice chat activities
* System does not track voice activity (API limitation), but assumes when there multiple users in the channel.
*/
import { type VoiceState, type GuildMember, type VoiceBasedChannel, VoiceChannel, ChannelType } from "discord.js";
import type { DiscordClient } from "../core/DiscordClient";
import { DiscordUser } from "../utils/DiscordUser";
import { captureException, captureMessage, logger, withIsolationScope } from "@sentry/node-core";
import { guildID, adminRoleID, newUserRoleID } from "../config.json";

const cacheName = "VCReward";


export class VoiceChatReward {
  private userTable: Map<string, _internalUser>;
  private chEligible: Map<string, boolean>;
  constructor(private client: DiscordClient) {
    this.client = client;
    this.userTable = new Map<string, _internalUser>();
    this.chEligible = new Map<string, boolean>(); // Store status if the given voice channel have at least 2 non-bot users
  };

  public async init() {
    // Load existing users in voice channels
    logger.debug("[VoiceChatReward]: Initializing VoiceChatReward Service...");
    const guild = this.client.guilds.cache.get(guildID);
    if(!guild)
      throw new VCError("Guild not found");
    const channels = guild.channels.cache.filter(c => c instanceof VoiceChannel && c.members.size > 0);
    for(const channel of channels.values())
      if(channel instanceof VoiceChannel) // Control Flow Purpose...
        for(const [, member] of channel.members)
          await this.joinChannel(member);

    // Bind the events
    setInterval(this.onTick.bind(this), 3000); // Tick every 3 seconds
    this.client.on("voiceStateUpdate", this.voiceStateUpdate.bind(this));
    logger.debug(logger.fmt`[VoiceChatReward]: VoiceChatReward Service Initialized (total users loaded: ${this.userTable.size})`);
  }

  private async voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const member = newState.member ?? oldState.member;
    if(!member || member.user.bot) return;

    await withIsolationScope(async scope => {
      try {
        scope.setUser({
          id: member.user.id,
          username: member.user.username,
          isStaff: member.roles.cache.some(r=>r.id === adminRoleID),
          isVerified: member.roles.cache.some(r=>r.id === newUserRoleID)
        });

        if(oldState.channel === null && newState.channel !== null)
          return await this.joinChannel(member);

        if(oldState.channel !== null && newState.channel === null)
          return await this.leaveChannel(member);

        // Update member object
        const newMember = newState.member;
        const _user = this.userTable.get(member.id);
        if(newMember && _user)
          _user.member = newMember;
      } catch (err) {
        captureException(err);
      }
    });
  };

  private async joinChannel(member: GuildMember) {
    if(this.userTable.delete(member.id))
      captureMessage("userTable failed to clear correctly", "error");

    const user = new _internalUser(member, new DiscordUser(this.client, member.user));
    this.userTable.set(member.id, user);
    await user.loadCache();
  }

  private async leaveChannel(member: GuildMember) {
    const tableUser = this.userTable.get(member.id);
    if(!tableUser)
      return captureMessage("User missing from userTable, but leaveChannel Invoked", "error");
    await tableUser.computeReward();
    this.userTable.delete(member.id);
  };

  private async onTick() {
    await withIsolationScope(async scope => {
      try {
        const users = this.userTable.values();
        for(const user of users) {
          scope.setUser({
            id: user.user.userID,
            username: user.user.username,
            isStaff: user.member.roles.cache.some(r=>r.id === adminRoleID),
            isVerified: user.member.roles.cache.some(r=>r.id === newUserRoleID)
          });

          const channel = user.member.voice.channel;
          if(!channel) {
            captureException(new VCError(`User is not in a voice channel, but tick() was called.`),
              {
                contexts: {
                  VoiceState: {
                    tableChannelID: user.member.voice.channelId,
                    currentChannelID: (await this.client.guilds.cache.first()?.members.fetch(user.member.id))?.voice.channelId
                  }
                }
              });
            continue;
          }

          // Check eligibility
          if(this.ChannelEligible(channel)) {
            if(channel.type === ChannelType.GuildVoice && !this.GV_userEligible(user.member))
              return;
            if(channel.type === ChannelType.GuildStageVoice && !this.GS_userEligible(user.member))
              return;

            await user.tick();
          }
        }

        this.chEligible.clear();
      } catch (err) { captureException(err); }
    });
  }

  private ChannelEligible(channel: VoiceBasedChannel): boolean {
    let state = this.chEligible.get(channel.id);
    if(state === undefined) {
      // Default State
      state = false;

      // Regular VC Eligibility Check
      if(channel.type === ChannelType.GuildVoice) {
        let cnt = 0;
        for(const [,memchk] of channel.members) {
          if(this.GV_userEligible(memchk)) cnt++;
          if(cnt === 2) break;
        }
        state = cnt >= 2;
      }

      // Stage VC Eligibility Check
      if(channel.type === ChannelType.GuildStageVoice) {
        let hasSpeaker = false;
        let hasAudience = false;
        for(const [,memchk] of channel.members) {
          // Find Speaker
          if(!memchk.voice.suppress)
            hasSpeaker = this.GS_userEligible(memchk);

          // Find Audience
          if(memchk.voice.suppress && !memchk.voice.mute)
            hasAudience = this.GS_userEligible(memchk);

          if(hasSpeaker && hasAudience) break; // No need to continue checking
        }
        state = hasSpeaker && hasAudience;
      }

      // Save State
      this.chEligible.set(channel.id, state);
    }
    return state;
  }

  private GV_userEligible(member: GuildMember): boolean {
    const vState = member.voice;
    if(member.user.bot) return false; // Bots are not allowed to earn points
    if(!vState.channel) return false; // Must be in a voice channel (edge case checks ig)
    if(vState.mute) return false; // Must not be muted
    if(vState.deaf) return false; // Must not be deafened
    return true; // User is eligible to earn points
  }

  private GS_userEligible(member: GuildMember): boolean {
    const vState = member.voice;
    if(member.user.bot) return false; // Bots are not allowed to earn points
    if(!vState.channel) return false; // Must be in a voice channel (edge case checks ig)
    if(vState.suppress && vState.mute) return false; // Audience must not be muted
    return !vState.suppress; // User is a speaker
  }
}

class _internalUser {
  public user: DiscordUser;
  public member: GuildMember;
  private secCounted: number; // In seconds

  constructor(member: GuildMember, user: DiscordUser) {
    this.member = member;
    this.user = user;
    this.secCounted = 0;
  }

  public async tick() {
    // Checkpoint every 3 minute
    this.secCounted += 3;
    if(this.secCounted % 60 === 0)
      await this.user.service.redis.set(this.user.getRedisKey(cacheName), this.secCounted.toString(), "EX", 3600);
  }

  // Pull potential cache value in-case bot restarted while user in VC
  public async loadCache() {
    const cacheData = await this.user.service.redis.get(this.user.getRedisKey(cacheName));
    if(cacheData)
      this.secCounted = parseInt(cacheData);
  }

  public async computeReward() {
    const rewardCount = Math.floor(this.secCounted / (600)); // RNG points per 10 minutes
    let points = 0;
    // Grant 7-11 points per rewardCount
    for(let i = 0; i < rewardCount; i++)
      points += this.user.economy.rngRewardPoints(7, 11);

    // Grant points and clean the cache
    await this.user.economy.grantPoints(points);
    await this.user.service.redis.del(this.user.getRedisKey(cacheName));
  }
};

class VCError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoiceChatReward";
  }
}