import { Prisma } from '@prisma/client';
import { captureException } from '@sentry/node';
import { redis, prisma } from '../utils/DatabaseManager';
export type updateData = {
    method: "add",
    memberid: string,
    username: string,
    verified?: boolean,
} | {
    method: "update",
    memberid?: string,
    username?: string,
    verified?: boolean
}
type userData = {
    id: string,
    memberid: string,
    username: string,
    verified: boolean,
}
type cacheData = {
    memberid?: string;
    username?: string,
}
// userid is for user's twitch ID; this class is used to manage twitch bot's cache system, replacing the current memory-based cache system.
export class twitchUser {
    userid: string;
    cachekey: string;
    constructor(userid: string) {
        this.userid = userid;
        this.cachekey = `userdata:${this.userid}`
    }
    /**
     * Retrieve the user data
     * @returns 
     */
    public async getCacheData(): Promise<cacheData | null> {
        // Pull data from redis
        const data = await redis.hGetAll(this.cachekey)
        if(Object.keys(data).length > 0) return {
            memberid: data.memberid,
            username: data.username,
        };
        // Data doesn't exist in redis, Update the cache
        const dbData = await this.getUserFromDB();
        if(!dbData) return null;
        const finalData = {
            memberid: dbData.memberid,
            username: dbData.username,
        }
        await this.updateDataCache(finalData);
        return finalData;

    }
    /**
     * Update user's cache data
     * @param newData
     */
    public async updateDataCache(newData: {
        memberid?: string,
        username?: string,
    } | cacheData): Promise<void> {
        // Clear out all the undefined and null objects
        if(!newData.memberid) delete newData.memberid;
        if(!newData.username) delete newData.username;
        // Update the cache   
        await redis.hSet(this.cachekey, newData)
        return;
    }
    /**
     * Pull ID directly from PostgreSQL Database. This is used by getDiscordID when redis didn't already have the record
     * @returns {undefined | string} the userID in the database
     */
    private async getUserFromDB(): Promise<null | userData> {
        if(!prisma) return null;
        return await prisma.twitch.findUnique({
            where: {
                id: this.userid,
            }
        })
    }
    /**
     * Add or Update user data from the database
     * @param status
     * @returns {boolean} The result of the operation. False means unsuccessful, while true means successful
     */
    public async updateUser(data: updateData): Promise<boolean> {
        if(!prisma) return false;
        try {
            if(data.method == "add") {
                // Add the user data
                await prisma.twitch.create({
                    data: {
                        id: this.userid,
                        memberid: data.memberid,
                        username: data.username,
                    }
                })
            }
            if(data.method == "update") {
                await prisma.twitch.update({
                    data: {
                        memberid: data.memberid,
                        username: data.username,
                        verified: data.verified,
                    },
                    where: {
                        id: this.userid
                    }
                })
                return true;
            }
            return true;
        } catch(ex) {
            // Record already existed (if add failure) or Record does not exist (if update failure)
            if(ex instanceof Prisma.PrismaClientKnownRequestError)
                if(['P2002', 'P2022'].find(v => v === (ex as Prisma.PrismaClientKnownRequestError).code))
                    return false;
            // Some other errors, log it to sentry
            captureException(ex);
            return false;
        }
    }
}

/**
 * This function clears all the cache that is created by this class
 */
export const clearCache = () => {
    // NOT IMPLEMENTED
}