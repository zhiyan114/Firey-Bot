import { APIEmbedField, ColorResolvable, DiscordAPIError, EmbedBuilder, User } from "discord.js";
import { LogType, sendLog } from "../utils/eventLogger";
import { prisma, redis } from "../utils/DatabaseManager";
import { APIErrors } from "../utils/discordErrorCode";
import { captureException } from "@sentry/node";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";

type embedMessageType = {
    title: string;
    message: string;
    color?: ColorResolvable;
    fields?: APIEmbedField[]
}
type updateUserData = {
    method: "create",
    rulesconfirmedon?: Date
} | {
    method: "update",
    tag?: string,
    rulesconfirmedon?: Date,
    points?: number,
    lastgrantedpoint?: Date,
}
type cacheData = {
    rulesconfirmedon?: Date,
    points?: number,
    lastgrantedpoint?: Date
}


/* Standard User Class */
export class DiscordUser {
    private user: User;
    private cachekey: string;
    public economy: UserEconomy;
    /**
    * This class is used to manage discord members
    * @param user The discord user object or userid
    */
    constructor(user: User) {
        if(user.bot) throw Error("The discord user cannot be a bot");
        this.user = user;
        this.cachekey = `discorduser:${user.id}`;
        this.economy = new UserEconomy(this, this.cachekey);
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
                points: data.username ? Number(data.username) : undefined,
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
     * Update the current cache with new data
     * @param newData The cache data to supply
     *
     */
    public async updateCacheData(newData: cacheData) {
        // Clear out all the undefined and null objects
        const filteredData: {[key: string]: string} = {}
        if(newData.rulesconfirmedon) filteredData['rulesconfirmedon'] = newData.rulesconfirmedon.toString();
        if(newData.points) filteredData['points'] = newData.points.toString();
        if(newData.lastgrantedpoint) filteredData['lastgrantedpoint'] = newData.lastgrantedpoint.toString();
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
        return await prisma.members.findUnique({
            where: {
                id: this.user.id
            }
        })
    }
    /**
     * Add or update the user in the database directly
     * @param data The operation data
     */
    public async updateUserData(data: updateUserData) {
        if(!prisma) return;
        try {
            if(data.method == "create") return await prisma.members.create({
                data: {
                    id: this.user.id,
                    tag: this.user.tag,
                    rulesconfirmedon: data.rulesconfirmedon,
                }
            })
            if(data.method == "update") return await prisma.members.update({
                data: {
                    tag: data.tag,
                    rulesconfirmedon: data.rulesconfirmedon,
                },
                where: {
                    id: this.user.id
                }
            })
        } catch(ex) {
            if(ex instanceof PrismaClientKnownRequestError && ex.code === "P2002") return;
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
            if(!(ex instanceof DiscordAPIError && ex.code == APIErrors.CANNOT_MESSAGE_USER)) captureException(ex);
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
    public async actionLog(actionName: string, author: DiscordUser, message: string, reason?: string, metadata?: {[key:string]: string | undefined}) {
        await prisma?.modlog.create({
            data: {
                memberid: this.user.id,
                moderatorid: author.user.id,
                action: actionName,
                reason: reason,
            }
        })
        await sendLog(LogType.Interaction, message, {
            reason,
            ...metadata
        });
    }
}

/* Standard Econonmy Class */
class UserEconomy {
    private user: DiscordUser;
    private cacheKey: string;
    constructor(user: DiscordUser, cacheKey: string) {
        this.user = user;
        this.cacheKey = cacheKey;
    }
}