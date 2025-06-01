/**
* Points reward system for voice chat activities
* System does not track voice activity (API limitation), but assumes when there multiple users in the channel.
*/
import { type VoiceState, type GuildMember, VoiceChannel } from "discord.js";
import type { DiscordClient } from "../core/DiscordClient";
import { DiscordUser } from "../utils/DiscordUser";
import { captureException, logger, withScope } from "@sentry/node";

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
    const guild = this.client.guilds.cache.get(this.client.config.guildID);
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
    logger.debug(`[VoiceChatReward]: VoiceChatReward Service Initialized (total users loaded: ${this.userTable.size})`);
  }

  private async voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const member = newState.member ?? oldState.member;
    if(!member || member?.user.bot) return;

    await withScope(async scope => {
      scope.setUser({
        id: member.user.id,
        username: member.user.username,
        isStaff: member.roles.cache.some(r=>r.id === this.client.config.adminRoleID),
        isVerified: member.roles.cache.some(r=>r.id === this.client.config.newUserRoleID)
      });

      if(oldState.channel === null && newState.channel !== null)
        return await this.joinChannel(member);

      if(oldState.channel !== null && newState.channel === null)
        return await this.leaveChannel(member);
    });
  };

  private async joinChannel(member: GuildMember) {
    if(this.userTable.delete(member.id))
      captureException(new VCError(`userTable failed to clear correctly. UserID Entry: ${member.id}`));

    const user = new _internalUser(member, new DiscordUser(this.client, member.user));
    this.userTable.set(member.id, user);
    await user.loadCache();
  }

  private async leaveChannel(member: GuildMember) {
    const tableUser = this.userTable.get(member.id);
    if(!tableUser)
      return captureException(new VCError(`User missing from userTable, but leaveChannel Invoked. UserID Entry: ${member.id}`));
    await tableUser.computeReward();
    this.userTable.delete(member.id);

  };

  private async onTick() {
    const users = this.userTable.values();
    for(const user of users) {
      await withScope(async scope => {
        scope.setUser({
          id: user.user.userID,
          username: user.user.username,
          isStaff: user.member.roles.cache.some(r=>r.id === this.client.config.adminRoleID),
          isVerified: user.member.roles.cache.some(r=>r.id === this.client.config.newUserRoleID)
        });

        // Check if the user's voice channel have at least 2 non-bot users
        const channel = user.member.voice.channel;
        if(!channel)
          throw new VCError(`User (${user.user.userID}) is not in a voice channel, but tick() was called.`);

        let state = this.chEligible.get(channel.id);
        if(state === undefined) {
          let cnt = 0;
          for(const [,memchk] of channel.members) {
            if(!memchk.user.bot) cnt++;
            if(cnt === 2) break;
          }
          state = cnt >= 2;
          this.chEligible.set(channel.id, state);
        }

        if(state === true)
          await user.tick();
      });
    }

    this.chEligible.clear();
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

  // Increment the time count
  public async tick() {

    // Checkpoint every 1 minute
    this.secCounted += 3;
    if(this.secCounted % 60 === 0)
      await this.user.client.redis.set(this.user.getRedisKey(cacheName), this.secCounted.toString(), "EX", 3600);
  }

  // Pull potential cache value in-case bot restarted while user in VC
  public async loadCache() {
    const cacheData = await this.user.client.redis.get(this.user.getRedisKey(cacheName));
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
    await this.user.client.redis.del(this.user.getRedisKey(cacheName));
  }
};

class VCError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoiceChatReward";
  }
}