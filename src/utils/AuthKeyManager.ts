/*
Authentication Key Request Service. Keys are used to authenticate external services.

Decrypted Key Format: DiscordUserID-TimeStamp
*/

import { Guild, GuildMember } from 'discord.js';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Honestly, no need to hardcode a constant key since the user generated AuthKey are temporary anyway. If they're invalid, just have them regenerate one.
const masterKey = Buffer.from(randomBytes(32));
const expireTime = 300000 // 5 minutes

export enum KeyStatus {
    Valid,
    Expired,
    Invalid,
}
export interface AuthKeyData {
    member?: GuildMember;
    status: KeyStatus;
}

export function generateAuthKey(userID: string, timeStamp?: number): string {
    if(!timeStamp) timeStamp = Date.now();
    const randIV = Buffer.from(randomBytes(12));
    const cipher = createCipheriv("aes-256-gcm", masterKey, randIV);
    const securedAuthKey = Buffer.concat([cipher.update(`${userID}-${timeStamp}`), cipher.final()]);
    return Buffer.concat([securedAuthKey, cipher.getAuthTag(), randIV]).toString("base64");
}

export async function getAuthKeyData(authKey: string, guild? : Guild): Promise<AuthKeyData> {
    try {
        const decryptedKey = decryptKey(authKey);
        // Key expires in 5 minutes
        if(Date.now() - decryptedKey.timeStamp > expireTime) return {status: KeyStatus.Expired};
        if(!guild) return {status: KeyStatus.Valid};
        return {status: KeyStatus.Valid, member: await guild.members.fetch(decryptedKey.userID)};
    } catch (e) {
        return {status: KeyStatus.Invalid};
    }
}


// Internal functions
interface decryptedKey {
    userID: string;
    timeStamp: number;
}
function decryptKey(authKey: string): decryptedKey {
    const authKeyBuffer = Buffer.from(authKey, "base64");
    const decipher = createDecipheriv("aes-256-gcm", masterKey, authKeyBuffer.slice(authKeyBuffer.length-12,12));
    decipher.setAuthTag(authKeyBuffer.slice(authKeyBuffer.length-12-16,authKeyBuffer.length-12));
    const decryptedData = Buffer.concat([decipher.update(authKeyBuffer.slice(0,authKeyBuffer.length-12-16)), decipher.final()]).toString().split("-");
    return {
        userID: decryptedData[0],
        timeStamp: parseInt(decryptedData[1]),
    }
}
/*
export function validateKey(authKey: string): KeyStatus {
    try {
        const decryptedKey = decryptKey(authKey);
        // Key expires in 5 minutes
        if(Date.now() - decryptedKey.timeStamp > expireTime) return KeyStatus.Expired;
        return KeyStatus.Valid;
    } catch (e) {
        return KeyStatus.Invalid;
    }
}
*/