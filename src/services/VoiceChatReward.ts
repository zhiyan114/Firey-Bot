/*
* Points reward system for voice chat activities
* !!! UNFINISHED - Probably never will !!!
*/

import { GuildMember, VoiceChannel, VoiceState } from "discord.js";
import { DiscordClient } from "../core/DiscordClient";
import { DiscordUser } from "../utils/DiscordUser";

const cacheName = "VCReward";

export class VoiceChatReward {
  private userTable: Map<string, _internalUser>;
  constructor(private client: DiscordClient) {
    this.client = client;
    this.userTable = new Map<string, _internalUser>();
  }

  public async init() {
    // Update table with existing VC users
    const guild = this.client.guilds.cache.get(this.client.config.guildID);
    if(!guild)
      return console.error("[VoiceChatReward]: Guild not found");
    const channels = guild.channels.cache.filter(c => c instanceof VoiceChannel && c.members.size > 0);
    for(const channel of channels.values())
      if(channel instanceof VoiceChannel) // Control Flow Purpose...
        for(const member of channel.members)
          await this.createUser(member[1]);

    // Register events
    this.client.on("voiceStateUpdate", this.voiceStateUpdate.bind(this));
  }

  private async voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    // Ignore bot events
    if((oldState ?? newState).member?.user.bot) return;

    // User join channel case
    if(oldState.channelId === null && newState.channelId !== null)
      return await this.createUser(newState.member as GuildMember);

    const userObj = this.userTable.get(oldState.member!.id);

    // User switch channel case
    if(
      oldState.channelId !== newState.channelId &&
      oldState.channelId !== null &&
      newState.channelId !== null
    ) {
      userObj?.end();
    }

    // User leave channel case
    if(oldState.channelId !== null && newState.channelId === null) {
      await userObj?.end();
      await userObj?.computeReward();
    }

  }

  private async createUser(member: GuildMember) {
    if(member.user.bot) return; // Ignore bots
    const dUser = new DiscordUser(this.client, member.user);
    if(this.userTable.has(member.id))
      return console.warn(`[VoiceChatReward]: User (${member.id}) already existed in userTable`);
    const _user = new _internalUser(dUser);
    this.userTable.set(member.id, _user);

    // Check and pull from cache DB
    const cacheData = await this.client.redis.get(dUser.getRedisKey(cacheName));
    if(cacheData)
      _user.msCounted = parseInt(cacheData);
  }
}

class _internalUser {
  private user: DiscordUser;
  private startTS: Date | null;
  public msCounted: number;

  /** msCounted param is used when external cache is used */ 
  constructor(user: DiscordUser) {
    this.user = user;
    this.startTS = null;
    this.msCounted = 0;
  }

  /** Call when voice activity is detected */
  public start() {
    if(this.startTS) 
      return console.warn(`[VoiceChatReward]: User (${this.user.getUserID}) already started activity`);
    this.startTS = new Date();
  }

  /** Call when voice activity ends */
  public async end() {
    if(!this.startTS) 
      return;
    this.msCounted += new Date().getTime() - this.startTS.getTime();
    this.startTS = null;
    await this.user.client.redis.set(this.user.getRedisKey(cacheName), this.msCounted.toString(), "EX", 3600); // 1 hour TTL
  }

  /** Call when user is leaving or removed from the voice channel and start rewarding the points */
  public async computeReward() {
    const rewardCount = Math.floor(this.msCounted / (5000*60)); // RNG points per 5 minutes
    let points = 0;
    // Grant 7-11 points per rewardCount
    for(let i = 0; i < rewardCount; i++)
      points += this.user.economy.rngRewardPoints(7, 11);

    // Grant points and clean the cache
    await this.user.economy.grantPoints(points);
    await this.user.client.redis.del(this.user.getRedisKey(cacheName));
  }
}