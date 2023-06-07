import { createHash } from "crypto";
import { Channel, ChannelType, Guild, GuildInvitableChannelResolvable, InviteCreateOptions, NewsChannel, TextChannel, VoiceChannel } from "discord.js";
import { redis } from "../utils/DatabaseManager";
import { client } from "..";


/**
 * Discord Invite Manager
 * @param requestid internal id for the invite request
 * @param guild the guild server to generate the invite
 */
export class DiscordInvite {
    private guild: Guild;
    private redisKey: string;
    private baseUrl = "https://discord.gg/";

    constructor(requestid?: string, guild?: Guild) {
        // Set the provided guild or the first one on the cache if this is a single server bot
        guild = guild ?? client.guilds.cache.first();
        if(!guild) throw new DiscordInviteError("No guild is available for the bot")
        this.guild = guild;

        // Key is made up of DiscInv:{First 6 digit of a sha512-hashed guild ID}:{First 6 digit of a sha512-hashed requestid or none if parm is null}
        const guildHash = this.getHash(guild.id, 6);
        const requestidHash = requestid ? `:${this.getHash(requestid, 6)}` : ""
        this.redisKey = `DiscInv:${guildHash}${requestidHash}`
    }

    /**
     * Generate sha512 hash of the data
     * @param data the string data that will be used to generate the hash
     * @param length The size of the hex that'll be returned (or full size if ignored)
     * @returns the computed sha512 data in hex format
     */
    private getHash(data: string, length?: number) {
        // Ignore the length parameter if the length size is invalid
        if(length && (length < 1 || length > 128)) length = undefined;

        // Generate sha512 hash from the data
        const hashedData = createHash('sha512').update(data).digest("hex");
        return length ? hashedData.slice(0,length) : hashedData;
    }

    /**
     * General algorithm to check if the guild channel
     * is eligible to create discord invite links
     * @param channel The channel to check
     * @returns whether the channel is eligible or not
     */
    private isInviteChannel(channel?: Channel | null) {
        if(!channel) return false;

        const validChannel = [
            ChannelType.GuildText,
            ChannelType.GuildVoice,
            ChannelType.GuildAnnouncement
        ].find(ch=> ch === channel.type)

        if(!validChannel) return false;
        return true;
    }

    /**
     * Create a templorary reusable invite link if vanity URL does not exist
     * @param inviteOpt Discord.js's Create Invite Options and the
     * default value for maxAge is 1 day
     * @param rawCode Whether to return an invite code or a full invite link
     * @returns The invite link or the code
     */
    public async getTempInvite(inviteOpt?: InviteCreateOptions, channel?: GuildInvitableChannelResolvable, rawCode?: boolean) {
        // Use the vanity code if possible
        if(this.guild.vanityURLCode) return rawCode ? this.guild.vanityURLCode : this.baseUrl + this.guild.vanityURLCode;

        // Use the cached invite key if it exists
        const cache = await redis.GET(this.redisKey);
        if(cache) return rawCode ? cache : this.baseUrl + cache;

        // Configure default inviteOpt if it does not exist
        if(!inviteOpt) inviteOpt = {};
        inviteOpt.maxAge = inviteOpt.maxAge ?? 86400;
        inviteOpt.reason = inviteOpt.reason ?? "Temporary Invite";

        // Find a valid guild channel to create invite in
        channel = channel ??
        this.guild.rulesChannel ?? 
        this.guild.publicUpdatesChannel ?? 
        // @TODO: REFACTOR THIS TO PRIORITIZE TEXTCHANNEL OVER VOICECHANNEL
        this.guild.channels.cache.find(ch=>this.isInviteChannel(ch)) as TextChannel | VoiceChannel | NewsChannel | undefined ??
        (await this.guild.channels.fetch()).find(ch=>this.isInviteChannel(ch)) as TextChannel | VoiceChannel | NewsChannel | undefined;
        if(!channel) throw new DiscordInviteError("No channel is associated with this server");

        // Create a new invite key and save it to the cache
        const inviteLink = await this.guild.invites.create(channel, inviteOpt);
        await redis.SET(this.redisKey, inviteLink.code);
        await redis.EXPIRE(this.redisKey, inviteOpt.maxAge);
        return rawCode ? inviteLink.code : inviteLink.url;
    }

}


export class DiscordInviteError extends Error {
    constructor(msg: string) {
        super(msg)
        this.name = "DiscordInviteError"
    }
}