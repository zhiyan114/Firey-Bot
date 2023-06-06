import { Prisma } from '@prisma/client';
import { captureException } from '@sentry/node';
import { redis, prisma } from '../utils/DatabaseManager';
import { DiscordUser, getUser } from './DiscordUser';
type updateUser = {
    memberid?: string,
    username?: string,
    verified?: boolean
}
type createUser = {
    memberid: string,
    username: string,
}
type userData = {
    id: string,
    memberid: string,
    username: string,
    verified: boolean,
}
type cacheData = {
    memberid?: string,
    username?: string,
    verified?: boolean,
}
// userid is for user's twitch ID; this class is used to manage twitch bot's redis cache system, replacing the current memory-based cache system.
export class TwitchUser {
    private userid: string;
    private cachekey: string;
    constructor(userid: string) {
        this.userid = userid;
        this.cachekey = `twitchuserdata:${this.userid}`
    }
    /**
     * Standard way of retrieving twitch user data
     * @returns Cache Data (memberid of -1 if account linking has not been started)
     */
    public async getCacheData(): Promise<cacheData> {
        // Check if the record already exist in redis
        if(await this.cacheExists()) {
            // Pull it up and use it
            const data = await redis.hGetAll(this.cachekey)
            return {
                memberid: data.memberid,
                username: data.username,
                verified: (data.verified !== undefined) ? data.verified === "true" : undefined,
            };
        }
        // Data doesn't exist in redis, Update the cache
        const dbData = await this.getUserFromDB();
        if(!dbData) {
            const guestUserData = {
                memberid: "-1",
            }
            await this.updateDataCache(guestUserData);
            return guestUserData
        };
        const finalData: cacheData = {
            memberid: dbData.memberid,
            username: dbData.username,
            verified: dbData.verified
        }
        await this.updateDataCache(finalData);
        return finalData;
    }
    /**
     * Checks if there is already a cache record for this user
     * @returns {boolean} return true if exist, otherwise false
     */
    public async cacheExists(): Promise<boolean> {
        return await redis.exists(this.cachekey) > 0;
    }
    /**
     * Update user's cache data
     * @param newData cacheData but all fields are optional
     */
    public async updateDataCache(newData: {
        memberid?: string,
        username?: string,
        verified?: boolean,
    }): Promise<void> {
        // Clear out all the undefined and null objects
        const filteredData: {[key: string]: string} = {}
        if(newData.memberid !== undefined) filteredData['memberid'] = newData.memberid;
        if(newData.username !== undefined) filteredData['username'] = newData.username;
        if(newData.verified !== undefined) filteredData['verified'] = newData.verified.toString();
        // Update the cache   
        await redis.hSet(this.cachekey, filteredData)
        // set redis expire key in 3 hours
        await redis.expire(this.cachekey, 10800)
        return;
    }
    /**
     * Pull user data directly from PostgreSQL Database. Should only be used if the record does not already exist in cache.
     * @returns {null | string} the userID in the database
     */
    private async getUserFromDB(): Promise<null | userData> {
        if(!prisma) return null;
        try {
            return await prisma.twitch.findUnique({
                where: {
                    id: this.userid,
                }
            })
        } catch(ex) {
            captureException(ex);
            return null;
        }
    }
    /**
     * Add a new user data to the database
     * @param data - The new data to be added
     * @returns User data if successfully create a new user, otherwise none
     */
    public async createUser(data: createUser) {
        try {
            return await prisma?.twitch.create({
                data: {
                    id: this.userid,
                    memberid: data.memberid,
                    username: data.username,
                }
            })
        } catch(ex) {
            if(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code === "P2002") return;
            captureException(ex);
        }
    }
    /**
     * Update the user data from the database
     * @param data The data to either add the user or update the user
     * @returns {boolean} The result of the operation. False means unsuccessful, while true means successful
     */
    public async updateUser(data: updateUser): Promise<boolean> {
        if(!prisma) return false;
        try {
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
            await this.updateDataCache({
                memberid: data.memberid,
                username: data.username,
                verified: data.verified
            })
            return true;
        } catch(ex) {
            // Record already existed (if add failure) or Record does not exist (if update failure)
            if(ex instanceof Prisma.PrismaClientKnownRequestError)
                if(['P2002', 'P2001'].find(v => v === (ex as Prisma.PrismaClientKnownRequestError).code))
                    return false;
            // Some other errors, log it to sentry
            captureException(ex);
            return false;
        }
    }
    public async getDiscordUser(): Promise<DiscordUser | undefined> {
        const data = await this.getCacheData();
        if(!data.memberid || data.memberid === "-1") return;
        return new DiscordUser(await getUser(data.memberid));
    }
}

/**
 * This function clears all the cache that is created by this class
 */
export const clearTwitchCache = async () => {
    while(true) {
        let oldCursor = 0;
        // get all the values
        const {cursor,keys} = await redis.scan(oldCursor,{
            MATCH: "discorduser:*",
            COUNT: 100,
        })
        // Delete or Unlink all the items
        for(const key of keys) await redis.unlink(key);
        // scan has been completed
        if(cursor === 0) break;
        // scan not completed, assign the new cursor
        oldCursor = cursor;
    }
}