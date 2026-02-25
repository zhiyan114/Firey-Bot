/**
* Points reward system for voice chat activities
* System does not track voice activity (API limitation), but assumes when there multiple users in the channel.
*/
import { type VoiceState, type GuildMember, type VoiceBasedChannel, VoiceChannel, ChannelType } from "discord.js";
import type { DiscordClient } from "../core/DiscordClient";
import { DiscordUser } from "../utils/DiscordUser";
import { captureException, logger, metrics, startNewTrace, withIsolationScope } from "@sentry/node-core";
import { guildID, adminRoleID, newUserRoleID } from "../config.json";

const cacheName = "VCReward";


export class VoiceChatReward {
  private userTable: Map<string, _internalUser>;
  private chEligible: Map<string, boolean>;
  private cacheLock: Map<string, boolean>;
  constructor(private client: DiscordClient) {
    this.client = client;
    this.userTable = new Map<string, _internalUser>();
    this.chEligible = new Map<string, boolean>(); // Store status if the given voice channel have at least 2 non-bot users
    this.cacheLock = new Map<string, boolean>(); // Prevent user from loading redis cache value while reward is being computed
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
    this.client.on("voiceStateUpdate", this.voiceStateUpdate.bind(this));
    this.onTick();
    logger.debug(logger.fmt`[VoiceChatReward]: VoiceChatReward Service Initialized (total users loaded: ${this.userTable.size})`);
  }

  private async voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const member = newState.member ?? oldState.member;
    if(!member || member.user.bot) return;

    await startNewTrace(async () => await withIsolationScope(async scope => {
      try {
        scope.setUser({
          id: member.user.id,
          username: member.user.username,
          isStaff: member.roles.cache.some(r=>r.id === adminRoleID),
          isVerified: member.roles.cache.some(r=>r.id === newUserRoleID)
        });

        if(!oldState.channel && newState.channel)
          return await this.joinChannel(member);

        if(oldState.channel && !newState.channel)
          return await this.leaveChannel(member);

        // Update member object
        const newMember = newState.member;
        const _user = this.userTable.get(member.id);
        if(newMember && _user)
          _user.member = newMember;
      } catch (err) {
        captureException(err);
      }
    }));
  };

  private async joinChannel(member: GuildMember) {
    if(this.userTable.delete(member.id))
      logger.warn(logger.fmt`[VoiceChatReward]: User ${member.user.tag} already exist in user mapping, but user just join the voice channel?`);

    const user = new _internalUser(member, new DiscordUser(this.client, member.user));
    this.userTable.set(member.id, user);
    if(!this.cacheLock.get(member.id))
      await user.loadCache();
  }

  private async leaveChannel(member: GuildMember) {
    const tableUser = this.userTable.get(member.id);
    if(!tableUser)
      return console.warn(logger.fmt`[VoiceChatReward]: User ${member.user.tag} left voice channel, but no existing records are found?`);
    this.userTable.delete(member.id);

    // Cache-locking to prevent RC to duplicate reward (fast join-leave-join)
    // Redis cache is only used to load in existing progress when software updates, not used by computeReward
    try {
      this.cacheLock.set(member.id, true);
      await tableUser.user.service.redis.del(tableUser.user.getRedisKey(cacheName));
      this.cacheLock.delete(member.id);
      await tableUser.computeReward();
    }
    catch(ex) { captureException(ex, { mechanism: { handled: false } }); }
    finally { this.cacheLock.delete(member.id); }
  };

  private onTick = async () => {
    await startNewTrace(async () => await withIsolationScope(async scope => {
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
              continue;
            if(channel.type === ChannelType.GuildStageVoice && !this.GS_userEligible(user.member))
              continue;

            await user.tick();
          }
        }

        this.chEligible.clear();
      } catch (err) { captureException(err, { mechanism: { handled: false } });
      } finally { setTimeout(this.onTick, 5000); }
    }));
  };

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
          if(memchk.voice.suppress && !memchk.voice.deaf)
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

  // VoiceChat Algo
  private GV_userEligible(member: GuildMember): boolean {
    const vState = member.voice;
    return (
      !member.user.bot &&
      vState.channel !== null &&
      !vState.mute &&
      !vState.deaf
    );
  }

  // StageChat Algo
  private GS_userEligible(member: GuildMember): boolean {
    const vState = member.voice;
    if(member.user.bot) return false; // Bots are not allowed to earn points
    if(!vState.channel) return false; // Must be in a voice channel (edge case checks ig)
    return !vState.suppress || !(vState.suppress && vState.deaf); // User is a speaker (doesnt have to be actively speaking) OR a listening audience
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
    this.secCounted += 5;
    if(this.secCounted % 60 === 0 || this.secCounted % 60 < 5)
      await this.user.service.redis.set(this.user.getRedisKey(cacheName), this.secCounted.toString(), "EX", 3600);
  }

  // Pull potential cache value in-case bot restarted while user in VC
  public async loadCache() {
    const cacheData = await this.user.service.redis.get(this.user.getRedisKey(cacheName));
    if(cacheData)
      this.secCounted = parseInt(cacheData);
  }

  public async computeReward() {
    const rewardCount = Math.floor(this.secCounted / 600); // RNG points per 10 minutes
    if(rewardCount === 0) return;

    let points = 0;
    // Grant 7-11 points per rewardCount
    for(let i = 0; i < rewardCount; i++)
      points += this.user.economy.rngRewardPoints(7, 11);

    // Grant points and clean the cache
    await this.user.economy.grantPoints(points);
    metrics.count("discord.points.accumulation", points, {
      attributes: { medium: "voice", accTime: this.secCounted }
    });
  }
};

class VCError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoiceChatReward";
  }
}