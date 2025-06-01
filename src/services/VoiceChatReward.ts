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
    logger.debug("[VoiceChatReward]: VoiceChatReward Service Initialized (total users loaded: " + this.userTable.size + ")");
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

// export class VoiceChatReward {
//   private userTable: Map<string, _internalUser>;
//   constructor(private client: DiscordClient) {
//     this.client = client;
//     this.userTable = new Map<string, _internalUser>();
//   }

//   public async init() {
//     // Update table with existing VC users
//     const guild = this.client.guilds.cache.get(this.client.config.guildID);
//     if(!guild)
//       return console.error("[VoiceChatReward]: Guild not found");

//     const channels = guild.channels.cache.filter(c => c instanceof VoiceChannel && c.members.size > 0);
//     for(const channel of channels.values())
//       if(channel instanceof VoiceChannel) // Control Flow Purpose...
//         for(const member of channel.members)
//           await this.createUser(member[1]);

//     // Register events
//     this.client.on("voiceStateUpdate", this.voiceStateUpdate.bind(this));
//   }

//   private async voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
//     // Ignore bot events
//     if((oldState ?? newState).member?.user.bot) return;

//     // User join channel case
//     if(oldState.channelId === null && newState.channelId !== null)
//       return await this.createUser(newState.member as GuildMember);

//     const userObj = this.userTable.get(oldState.member!.id);

//     // User switch channel case
//     if(
//       oldState.channelId !== newState.channelId &&
//       oldState.channelId !== null &&
//       newState.channelId !== null
//     ) {
//       userObj?.end();
//     }

//     // User leave channel case
//     if(oldState.channelId !== null && newState.channelId === null) {
//       await userObj?.end();
//       await userObj?.computeReward();
//     }

//   }

//   private async createUser(member: GuildMember) {
//     if(member.user.bot) return; // Ignore bots
//     const dUser = new DiscordUser(this.client, member.user);
//     if(this.userTable.has(member.id))
//       return console.warn(`[VoiceChatReward]: User (${member.id}) already existed in userTable`);
//     const _user = new _internalUser(dUser);
//     this.userTable.set(member.id, _user);

//     // Check and pull from cache DB
//     const cacheData = await this.client.redis.get(dUser.getRedisKey(cacheName));
//     if(cacheData)
//       _user.msCounted = parseInt(cacheData);
//   }
// }

// class _internalUser {
//   private user: DiscordUser;
//   private startTS: Date | null;
//   public msCounted: number;

//   /** msCounted param is used when external cache is used */
//   constructor(user: DiscordUser) {
//     this.user = user;
//     this.startTS = null;
//     this.msCounted = 0;
//   }

//   /** Call when voice activity is detected */
//   public start() {
//     if(this.startTS)
//       return console.warn(`[VoiceChatReward]: User (${this.user.getUserID}) already started activity`);
//     this.startTS = new Date();
//   }

//   /** Call when voice activity ends */
//   public async end() {
//     if(!this.startTS)
//       return;
//     this.msCounted += new Date().getTime() - this.startTS.getTime();
//     this.startTS = null;
//     await this.user.client.redis.set(this.user.getRedisKey(cacheName), this.msCounted.toString(), "EX", 3600); // 1 hour TTL
//   }

//   /** Call when user is leaving or removed from the voice channel and start rewarding the points */
//   public async computeReward() {
//     const rewardCount = Math.floor(this.msCounted / (5000*60)); // RNG points per 5 minutes
//     let points = 0;
//     // Grant 7-11 points per rewardCount
//     for(let i = 0; i < rewardCount; i++)
//       points += this.user.economy.rngRewardPoints(7, 11);

//     // Grant points and clean the cache
//     await this.user.economy.grantPoints(points);
//     await this.user.client.redis.del(this.user.getRedisKey(cacheName));
//   }
// }