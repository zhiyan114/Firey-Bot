import { redis } from '../utils/DatabaseManager';

// userid is for user's twitch ID; this class is used to manage twitch bot's cache system, replacing the current memory-based cache system.
export class twitchEcon {
    userid: string;
    constructor(userid: string) {
        this.userid = userid;
    }
    public async getDiscordID(): Promise<string> {
        // Discord ID Cache Stuff Here
        return "A";
    }
    public async updateDiscordID(discordID: string): Promise<void> {
        // Discord ID Cache Stuff Here
    }
}