import type { APIEmbedField, ColorResolvable, User } from "discord.js";
import type { DiscordClient } from "../core/DiscordClient";
import { DiscordAPIError, EmbedBuilder } from "discord.js";
import { APIErrors } from "./discordErrorCode";
import { captureException } from "@sentry/node-core";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { sendLog } from "./eventLogger";

type embedMessageType = {
    title: string;
    message: string;
    color?: ColorResolvable;
    fields?: APIEmbedField[]
}
type updateUserData = {
    username?: string,
    displayName?: string;
    rulesconfirmedon?: Date,
    points?: number,
    lastgrantedpoint?: Date,
}
type cacheData = {
    rulesconfirmedon?: Date,
    points?: number,
    lastgrantedpoint?: Date
}
type ActionLogOpt = {
    actionName: string;
    target?: DiscordUser;
    message: string;
    reason?: string;
    metadata?: {[key:string]: string}
}


export class DiscordUser {
  private user: User;
  public client: DiscordClient;
  private cachekey: string;
  private userHash: string;
  public economy: UserEconomy;

  /**
    * This class is used to manage discord users
    * @param user The discord user object or userid
    */
  constructor(client: DiscordClient, user: User) {
    if(user.bot) throw Error("The discord user cannot be a bot");
    this.user = user;
    this.client = client;

    // Use the first 6 digit of sha512 as user key
    this.userHash = createHash("sha512").update(user.id).digest("hex");
    this.cachekey = `discuser:${this.userHash.slice(0,6)}`;
    this.economy = new UserEconomy(this, user.id, this.cachekey);
  }

  /**
    * Check if the user has confirm the rules or not
    * @returns a boolean on their confirmation status
    */
  public async isVerified() {
    // check to see if the user is already in the discord server and has the said role.
    if((await this.getCacheData())?.rulesconfirmedon) return true;
    return false;
  }

  /**
     * Returns a boolean if the user has already been cached in redis
     * @returns {boolean} if the user exists
     */
  public async cacheExists(): Promise<boolean> {
    return await this.client.redis.exists(this.cachekey) > 0;
  }

  /**
     * Returns all the user data stored in the cache (or freshly from database)
     * @returns {cacheData | undefined} returns undefined if the user does not exist in the database, otherwise returns cacheData
     */
  public async getCacheData(): Promise<cacheData | undefined> {
    // Check if the record already exist in redis
    if(await this.cacheExists()) {
      // Pull it up and use it
      const data = await this.client.redis.hgetall(this.cachekey);
      return {
        rulesconfirmedon: data.rulesconfirmedon ? new Date(data.rulesconfirmedon) : undefined,
        points: data.points ? Number(data.points) : undefined,
        lastgrantedpoint: data.lastgrantedpoint ? new Date(data.lastgrantedpoint) : undefined,
      };
    }
    // Data doesn't exist in redis, Update the cache
    const dbData = await this.getUserFromDB();
    if(!dbData) return;
    const finalData: cacheData = {
      rulesconfirmedon: dbData.rulesconfirmedon ?? undefined,
      points: dbData.points,
      lastgrantedpoint: dbData.lastgrantedpoint,
    };
    await this.updateCacheData(finalData);
    return finalData;
  }

  /**
     * Update the current cache with new data (use updateUserData instead)
     * @param newData The cache data to supply
     *
     */
  public async updateCacheData(newData: cacheData) {
    // Clear out all the undefined and null objects
    const filteredData: {[key: string]: string} = {};
    if(newData.rulesconfirmedon !== undefined) filteredData["rulesconfirmedon"] = newData.rulesconfirmedon.toString();
    if(newData.points !== undefined) filteredData["points"] = newData.points.toString();
    if(newData.lastgrantedpoint !== undefined) filteredData["lastgrantedpoint"] = newData.lastgrantedpoint.toString();
    // Update the cache
    await this.client.redis.hset(this.cachekey, filteredData);
    // set redis expire key in 5 hours
    await this.client.redis.expire(this.cachekey, 18000);
  }

  /**
     * Get the user data from the database directly, should only be used when the cache didn't have the data.
     */
  private async getUserFromDB() {
    try {
      const dbUser = await this.client.prisma.members.findUnique({
        where: {
          id: this.user.id
        }
      });
      if(!dbUser) return await this.createNewUser();
      return dbUser;
    } catch(ex) {
      captureException(ex);
    }
  }

  /**
     * Algorithm determines if the user is using the old tag system or the new username system
     * @returns The current username
     */
  public get username() {
    if(this.user.discriminator === "0") return this.user.username;
    return this.user.tag;
  }

  /**
   * General discord user ID getter w/o exposing user object
   */
  public get userID() {
    return this.user.id;
  }

  /** Get redis user hash
   * @param prefix Redis key prefix to use (optional)
   * @returns The redis key to use
  */
  public getRedisKey(prefix?: string) {
    if(!prefix) return this.cachekey;
    return `${prefix}:${this.cachekey}`;
  }

  /**
     * update the user in the database directly
     * @param data The operation data (or info based on the provided user object if undefined)
     * @returns whether the operation was successful or not
     */
  public async updateUserData(data?: updateUserData) {
    try {
      const newData = await this.client.prisma.members.update({
        data: {
          username: data ? data.username : this.username,
          displayname: data ? data.displayName : this.user.displayName,
          rulesconfirmedon: data?.rulesconfirmedon,
        },
        where: {
          id: this.user.id
        }
      });
      await this.updateCacheData({
        rulesconfirmedon: newData.rulesconfirmedon ?? undefined,
        points: newData.points,
        lastgrantedpoint: newData.lastgrantedpoint
      });
      return true;
    } catch(ex) {
      if(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code === "P2025") {
        // User not found, create one
        await this.createNewUser(data?.rulesconfirmedon);
        return true;
      }
      captureException(ex);
      return false;
    }
  }

  /**
     * create the user in the database directly
     * @param rulesconfirmed The date which the user has confirmed the rules on
     * @returns User data if successfully create a new user, otherwise none
     */
  public async createNewUser(rulesconfirmed?: Date) {
    try {
      return await this.client.prisma.members.create({
        data: {
          id: this.user.id,
          username: this.username,
          displayname: this.user.displayName,
          rulesconfirmedon: rulesconfirmed,
        }
      });
    } catch(ex) {
      // Idek, we'll just ignore it for now
      if(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code === "P2002") return;
      captureException(ex);
    }
  }

  /**
    * send a member a message in DM using embed
    * @param messageOption Embed Message or a String Message
    * @returns {boolean} Whether the operation has succeeded or not
    */
  public async sendMessage(messageOption: embedMessageType | string): Promise<boolean> {
    try {
      if(typeof(messageOption) === "string") {
        await this.user.send(messageOption);
        return true;
      }
      const embed = new EmbedBuilder()
        .setTitle(messageOption.title)
        .setDescription(messageOption.message)
        .setColor(messageOption.color ?? "#00FFFF")
        .setTimestamp()
        .setFooter({
          text: "Notification Service"
        });
      if(messageOption.fields) embed.setFields(messageOption.fields);
      await this.user.send({ embeds:[embed] });
      return true;
    } catch(ex) {
      if(!(ex instanceof DiscordAPIError && ex.code === APIErrors.CANNOT_MESSAGE_USER)) captureException(ex);
      return false;
    }
  }

  /**
    * Internal Use: Log the actions the author executed on target
    * @param actionName The name of the action that was taken
    * @param author The user that executed the action
    * @param message The action message to be shown on the guild's log
    * @param reason The reason for the action
    * @param metadata Additional data to be added for sendLog
    */
  public async actionLog(opt: ActionLogOpt) {
    try {
      await this.client.prisma.modlog.create({
        data: {
          targetid: opt.target?.user.id,
          moderatorid: this.user.id,
          action: opt.actionName,
          reason: opt.reason,
          metadata: opt.metadata
        }
      });
    } catch(ex) {
      if(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code === "P2003")
        await sendLog({
          type: "Warning",
          message: "actionLog failed due to missing target in the database",
          metadata: opt.metadata,
        });
      else captureException(ex);
    }

    await sendLog({
      type: "Interaction",
      message: opt.message,
      metadata: { reason: opt.reason, ...opt.metadata },
    });
  }
}



/**
 * This class is initialized internally by DiscordUser to manage member's economy data
 * @param userid the user ID that will be used to manage the data with
 * @param user the user object that will help the class function, specifically, access and manage cache data
 */
class UserEconomy {
  private userid: string;
  private user: DiscordUser;
  private cacheKey: string;
  constructor(user: DiscordUser, userid: string, cacheKey: string) {
    this.user = user;
    this.userid = userid;
    this.cacheKey = cacheKey;
  }

  /**
     * Generate a random amount of points between a range
     * @param min Minimum points to generate
     * @param max Maximum points to generate
     * @returns the result of the RNG value
     */
  public rngRewardPoints(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
     * Grant the user certain amount of points
     */
  public async grantPoints(points: number) {
    // User exist and condition passes, grant the user the points
    const newData = await this.user.client.prisma.members.update({
      data: {
        lastgrantedpoint: new Date(),
        points: { increment: points }
      },
      where: {
        id: this.userid
      }
    });
    await this.user.updateCacheData({
      points: newData.points,
      lastgrantedpoint: newData.lastgrantedpoint
    });
  }

  /**
     * Deduct certain amount of points from the user
     * @param points The total amount of points to deduct
     * @param allowNegative If this operation allows the user to have negative amount of points (default false).
     * @param allowNegative Set this to `true` if you implemented custom balance check to avoid the extra `getCacheData` call
     * @returns if the operation was successful or not
     */
  public async deductPoints(points: number, allowNegative?: boolean) {
    // Check if user are allowed to have negative balance
    if(!allowNegative) {
      const cacheData = await this.user.getCacheData();
      if (!(cacheData?.points) || cacheData.points < points) return false;
    }
    // User has enough, deduct it
    const newData = await this.user.client.prisma.members.update({
      data: {
        points: { decrement: points }
      },
      where: {
        id: this.userid,
      }
    });
    await this.user.updateCacheData({
      points: newData.points
    });
    return true;
  }

  /**
     * Internal Algorithm that automatically reward the user with points when they chat
     * @param text The text message that the user sent (this text will be used to determine the reward's eligibility)
     * @param ignoreCooldown Whether to ignore the cooldown or not
     * @returns whether the user has been successfully rewarded or not
     */
  public async chatRewardPoints(text: string, ignoreCooldown?: boolean) {
    // Get user data and check to see if they met the cooldown eligibility
    const userData = await this.user.getCacheData();
    if(!userData) return false;
    if(!ignoreCooldown && (userData.lastgrantedpoint && userData.lastgrantedpoint.getTime() > (new Date()).getTime() - 60000)) return false;

    /*
      This algorithm checks to see if the user has a message that is
        - longer than 10 characters
        - does not only contain numbers, special character, emoji, or links
        - does not only have repeating characters
      If the user is not eligible, their reward cooldown timer resets while not getting any points
      */

    if(
      text.length < 10 || // Length check
      (/^[0-9]+$/g).test(text) || // Number Check
      (/^[^a-zA-Z0-9]+$/g).test(text) || // Special Character check
      (/^(:[a-zA-Z0-9_]+: ?)+$/g).test(text) || // Emoji check
      (/(.)\1{3,}/g).test(text) || // Repeating character check
      (/https?:\/\/[^\s]+/g).test(text) // link check
    ) {
      await this.user.updateCacheData({
        lastgrantedpoint: new Date()
      });
      return false;
    }

    // Grant the point
    await this.grantPoints(this.rngRewardPoints(5,10));
    return true;
  }

  public async getBalance() {
    return Number(await this.user.client.redis.hget(this.cacheKey,"points") ?? (await this.user.getCacheData())?.points ?? "0");
  }
}