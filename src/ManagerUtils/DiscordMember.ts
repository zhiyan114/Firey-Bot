import { APIEmbedField, ColorResolvable, DiscordAPIError, EmbedBuilder, GuildMember, User } from "discord.js";
import { client } from "../index";
import { adminRoleID, guildID, newUserRoleID } from "../config";
import { LogType, sendLog } from "../utils/eventLogger";
import { prisma } from "../utils/DatabaseManager";
import { createUserData, updateUserData } from "../DBUtils/UserDataManager";
import { APIErrors } from "../utils/discordErrorCode";
import { captureException } from "@sentry/node";

type embedMessageType = {
    title: string;
    message: string;
    color?: ColorResolvable;
    fields?: APIEmbedField[]
}

export class DiscordMember {
    private member: GuildMember;
    /**
    * This class is used to manage discord members
    * @param member The discord member
    */
    constructor(member: GuildMember) {
        this.member = member;
    }
    /**
    * Grant the member a verified role
    * @returns false if they had already been verified, otherwise true
    */
    public async verify() {
        // check if the user already has the verification role
        if(this.member.roles.cache.has(newUserRoleID)) return false;
        // User does not, update the user
        await this.member.roles.add(newUserRoleID);
        const updatedUser = await updateUserData(this.member.user, {rulesconfirmedon: new Date()});
        if(!updatedUser) await createUserData(this.member.user, new Date());
        return true;
    }
    /**
    * send a member a message in DM using embed
    * @param messageOption Message option
    */
    public async sendMessage(messageOption: embedMessageType | string) {
        try {
            if(typeof(messageOption) === "string") return this.member.send(messageOption);
            const embed = new EmbedBuilder()
                .setTitle(messageOption.title)
                .setDescription(messageOption.message)
                .setColor(messageOption.color ?? "#00FFFF")
                .setTimestamp()
                .setFooter({
                    text: "Notification Service"
                });
            if(messageOption.fields) embed.setFields(messageOption.fields);
            await this.member.send({embeds:[embed]});
        } catch(ex) {
            if(ex instanceof DiscordAPIError && ex.code == APIErrors.CANNOT_MESSAGE_USER) return;
            captureException(ex);
        }
    }
    /**
    * kick a member from the guild
    * @param author The user that initalize the kick
    * @param reason The reason the member got kicked
    * @param includeInvite whether to include a one time invite for the user to join back
    * @returns The user that got kicked
    */
    public async kick(author: GuildMember | DiscordMember, reason?: string) {
        if(author instanceof DiscordMember) author = author.member;
        if(!this.member.kickable) return;
        // Kick them
        await this.member.kick(reason);
        // Add to logs
        await this.actionLog("kick", author.user, `<@${this.member.user.id}> has been kicked by <@${author.user.id}>`, reason)
        return this.member.user;
    }
    /**
    * ban a member from the guild
    * @param author The user that initalize the ban
    * @param reason The reason the member got banned
    * @param purge Delete all the recent messages from the member
    * @returns The user that got banned
    */
    public async ban(author: GuildMember | DiscordMember, reason?: string, purgeMessage?: boolean) {
        if(author instanceof DiscordMember) author = author.member;
        if(!this.member.bannable) return;
        await this.member.ban({
            reason,
            deleteMessageSeconds: purgeMessage ? 604800 : undefined
        })
        await this.actionLog("ban", author.user, `<@${this.member.user.id}> has been banned by <@${author.user.id}>`, reason, {
            deleteMessages: purgeMessage?.toString() ?? "false"
        })
    }
    /** 
    * soft ban a member from the guild (kick but also erase their recent message)
    * @param author the user that initalize the soft ban
    * @param reason the reason to soft ban the user
    * @returns The user that got soft banned
    */
    public async softBan(author: GuildMember | DiscordMember, reason?: string) {
        if(author instanceof DiscordMember) author = author.member;
        if(!this.member.bannable) return;
        await this.member.ban({
            reason,
            deleteMessageSeconds: 604800,
        })
        if(reason) reason += " (Soft Ban)"
        else reason = "Soft Ban";
        await author.guild.bans.remove(this.member.user.id, reason)
        await this.actionLog("softban", author.user, `<@${this.member.user.id}> has been softbanned by <@${author.user.id}>`, reason)
        return this.member.user;
    }
    /**
    * Unban someone from the guild
    * @param user The target to unban
    * @param reason the reason for the action
    * @returns The user or undefine
    */
    public async unbanTarget(target: User, reason?: string) {
        // Check for user's privilege
        if(!this.member.roles.cache.find(role=> role.id === adminRoleID)) return;
        const resultUser = await this.member.guild.bans.remove(target);
        this.actionLog("unban", this.member.user, `<@${target.id}> has been unbanned by <@${this.member.user.id}>`, reason)
        return resultUser;
    }
    /**
    * Internal Use: Log the actions the author executed on target
    * @param actionName The name of the action that was taken
    * @param author The user that executed the action
    * @param message The action message to be shown on the guild's log
    * @param reason The reason for the action
    * @param metadata Additional data to be added for sendLog
    * @returns Void
    */
    private async actionLog(actionName: string, author: User, message: string, reason?: string, metadata?: {[key:string]: string | undefined}) {
        await prisma?.modlog.create({
            data: {
                memberid: this.member.id,
                moderatorid: author.id,
                action: actionName,
                reason: reason,
            }
        })
        await sendLog(LogType.Interaction, message, {
            reason,
            ...metadata
        });
    }
    /**
    * Get a member from a discord ID
    * @param id The discord ID of the member
    * @returns The member or undefined
    */
    public static async getMemberFromID(id: string | User) {
        try {
            if(id instanceof User) id = id.id;
            return await client.guilds.cache.get(guildID)?.members.fetch(id); 
        } catch {
            return;
        }
    }
}