import * as config from '../../config.json';
import { GuildMember, Client } from 'discord.js';

class userRole {
    private user: GuildMember;
    constructor(user?: GuildMember) {
        if(user) this.user = user;
    }
    public async IDSetup(id: string, client?: Client): Promise<void> {
        this.user = await client.guilds.cache.find(k=> k.id === config['serverID']).members.fetch(id);
    }
    public async check(roleID: string): Promise<boolean> {
        return this.user.roles.cache.has(roleID);
    }
    public async add(roleID: string): Promise<void> {
        const role = await this.user.guild.roles.fetch(roleID);
        await this.user.roles.add(role);
    }
    public async remove(roleID: string): Promise<void> {
        const role = await this.user.guild.roles.fetch(roleID);
        await this.user.roles.remove(role);
    }

}


export default userRole;