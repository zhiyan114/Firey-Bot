import { APIEmbedField, ColorResolvable, DiscordAPIError, EmbedBuilder, User } from "discord.js";
import { LogType, sendLog } from "../utils/eventLogger";
import { prisma, redis } from "../utils/DatabaseManager";
import { APIErrors } from "../utils/discordErrorCode";
import { captureException } from "@sentry/node";
import { Prisma } from "@prisma/client";
import { client } from "..";

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



export const getUser = async(id: string) => await client.users.fetch(id);

export class DiscordUser {
    private user: User;
    private cachekey: string;
    public economy: UserEconomy;
    /**
    * This class is used to manage discord users
    * @param user The discord user object or userid
    */
    constructor(user: User) {
        if(user.bot) throw Error("The discord user cannot be a bot");
        this.user = user;
        this.cachekey = `discorduser:${user.id}`;
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
        return await redis.exists(this.cachekey) > 0;
    }
    /**
     * Returns all the user data stored in the cache (or freshly from database)
     * @returns {cacheData | undefined} returns undefined if the user does not exist in the database, otherwise returns cacheData
     */
    public async getCacheData(): Promise<cacheData | undefined> {
        // Check if the record already exist in redis
        if(await this.cacheExists()) {
            // Pull it up and use it
            const data = await redis.hGetAll(this.cachekey)
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
        }
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
        const filteredData: {[key: string]: string} = {}
        if(newData.rulesconfirmedon !== undefined) filteredData['rulesconfirmedon'] = newData.rulesconfirmedon.toString();
        if(newData.points !== undefined) filteredData['points'] = newData.points.toString();
        if(newData.lastgrantedpoint !== undefined) filteredData['lastgrantedpoint'] = newData.lastgrantedpoint.toString();
        // Update the cache   
        await redis.hSet(this.cachekey, filteredData)
        // set redis expire key in 5 hours
        await redis.expire(this.cachekey, 18000)
        return;
    }
    /**
     * Get the user data from the database directly, should only be used when the cache didn't have the data.
     */
    private async getUserFromDB() {
        if(!prisma) return;
        try {
            const dbUser = await prisma.members.findUnique({
                where: {
                    id: this.user.id
                }
            })
            if(!dbUser) return await this.createNewUser();
            return dbUser;
        } catch(ex) {
            captureException(ex)
        }
    }
    /**
     * update the user in the database directly
     * @param data The operation data (or info based on the provided user object if undefined)
     * @returns whether the operation was successful or not
     */
    public async updateUserData(data?: updateUserData) {
        if(!prisma) return;
        try {
            let newData = await prisma.members.update({
                data: {
                    username: data ? data.username : (this.user.discriminator === "0" ? this.user.username : this.user.tag),
                    rulesconfirmedon: data?.rulesconfirmedon,
                },
                where: {
                    id: this.user.id
                }
            })
            await this.updateCacheData({
                rulesconfirmedon: newData.rulesconfirmedon ?? undefined,
                points: newData.points,
                lastgrantedpoint: newData.lastgrantedpoint
            })
            return true;
        } catch(ex) {
            if(ex instanceof Prisma.PrismaClientKnownRequestError) {
                switch(ex.code) {
                    case "P2001":
                        // User not found, create one
                        await this.createNewUser(data?.rulesconfirmedon);
                        return true;
                    case "P2002":
                        return false;
                }
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
        if(!prisma) return;
        try {
            return await prisma.members.create({
                data: {
                    id: this.user.id,
                    username: this.user.discriminator === "0" ? this.user.username : this.user.tag,
                    rulesconfirmedon: rulesconfirmed,
                }
            })
        } catch(ex) {
            captureException(ex)
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
            await this.user.send({embeds:[embed]});
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
        await prisma?.modlog.create({
            data: {
                targetid: opt.target?.user.id,
                moderatorid: this.user.id,
                action: opt.actionName,
                reason: opt.reason,
                metadata: opt.metadata
            }
        })
        await sendLog(LogType.Interaction, opt.message, {
            reason: opt.reason,
            ...opt.metadata
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
        min = Math.ceil(min)
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    /**
     * Grant the user certain amount of points
     * @param options Customize the way points are granted
     * @param updateTimestampOnly Whether to only update the timestamp of the granted points or not (useful for auto-granting point system to deter spammers)
     * @returns whether the points has been successfully granted or not
     */
    public async grantPoints(points: number) {
        if(!prisma) return false;
        // User exist and condition passes, grant the user the points
        const newData = await prisma.members.update({
            data: {
                lastgrantedpoint: new Date(),
                points: {increment: points}
            },
            where: {
                id: this.userid
            }
        })
        await this.user.updateCacheData({
            points: newData.points,
            lastgrantedpoint: newData.lastgrantedpoint
        })
        return true;
    }
    /**
     * Deduct certain amount of points from the user
     * @param points The total amount of points to deduct
     * @param allowNegative If this operation allows the user to have negative amount of points (default false).
     * @param allowNegative Set this to `true` if you implemented custom balance check to avoid the extra `getCacheData` call
     * @returns if the operation was successful or not
     */
    public async deductPoints(points: number, allowNegative?: boolean) {
        if(!prisma) return false;
        // Check if user are allowed to have negative balance
        if(!allowNegative) {
            const cacheData = await this.user.getCacheData()
            if (!(cacheData?.points) || cacheData.points < points) return false;
        }
        // User has enough, deduct it
        const newData = await prisma.members.update({
            data: {
                points: {decrement: points}
            },
            where: {
                id: this.userid,
            }
        })
        await this.user.updateCacheData({
            points: newData.points
        })
        return true;
    }
    /**
     * Internal Algorithm that automatically reward the user with points when they chat
     * @param text The text message that the user sent (this text will be used to determine the reward's eligibility)
     * @param ignoreCooldown Whether to ignore the cooldown or not
     * @returns whether the user has been successfully rewarded or not
     */
    public async chatRewardPoints(text: string, ignoreCooldown?: boolean) {
        // Get the user data
        const userData = await this.user.getCacheData();
        if(!userData) return false;
        // 1 minute cooldown unless ignored
        if(!ignoreCooldown && (userData.lastgrantedpoint && userData.lastgrantedpoint.getTime() > (new Date()).getTime() - 60000)) return false;
        /*
        Algorithm to check for the eligibility of the reward (welp, can't have a secure eligibility algorithm without it being obscurity)
        At least it can be somewhat effective I guess. I could also remove comment to make it slightly more difficult to read, but not worth it.
        */
        const isEligible: boolean[] = [
            // Check for the message length
            text.length > 5,
            // Check to see if the message only contains numbers (you can have text with numbers, but not only numbers)
            !text.match(/^[0-9]+$/g),
            // Check to see if the message contains only special characters (this unfortunately includes foreign language)
            !text.match(/^[^a-zA-Z0-9]+$/g),
            // Check to see if the message only contains discord emotes
            !text.match(/^(:[a-zA-Z0-9_]+: ?)+$/g),
            // Check message to see if there is any large repeating characters
            !text.match(/(.)\1{3,}/g),
            // Check to see if the message contains links
            !text.match(/https?:\/\/[^\s]+/g),
        ];
        if(isEligible.find(e=>e === false) !== undefined) {
            // The user is not eligible and will have a delay before another eligibility check
            await this.user.updateCacheData({
                lastgrantedpoint: new Date()
            })
            return false;
        }
        // Grant the point
        await this.grantPoints(this.rngRewardPoints(5,10));
        return true;
    }
    public async getBalance() {
        return Number(await redis.hGet(this.cacheKey,"points") ?? (await this.user.getCacheData())?.points ?? "0");
    }
}