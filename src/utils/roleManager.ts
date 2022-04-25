import { serverID } from '../../config.json';
import { GuildMember, Client, RoleManager, Guild, Collection, Role, Snowflake, PermissionResolvable } from 'discord.js';

// User Role Manager
class userRoleManager {
    private user: GuildMember;
    constructor(user?: GuildMember) {
        if(user) this.user = user;
    }
    public async IDSetup(id: string, client?: Client): Promise<void> {
        this.user = await client.guilds.cache.find(k=> k.id === serverID).members.fetch(id);
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

// Server Role Manager (more for managing the role's configuration for a guild)
class serverRoleManager {
    private guildRoleManager: RoleManager;
    constructor(server: Guild) {
        this.guildRoleManager = server.roles;
    }
    public async getAllRoles(): Promise<Collection<Snowflake, Role>> {
        return this.guildRoleManager.cache;
    }

}

class roleManager {
    private role: Role;
    constructor(role: Role) {
        this.role = role;
    }
    public async getAllPermissions(): Promise<PermissionResolvable> {
        return this.role.permissions;
    }
    public async addPermission(permission: PermissionResolvable, reason?: string): Promise<void> {
        const currentPerm = this.role.permissions;
        currentPerm.add(permission);
        await this.role.setPermissions(currentPerm, reason);
    }
    public async removePermission(permission: PermissionResolvable, reason?: string): Promise<void> {
        const currentPerm = this.role.permissions;
        currentPerm.remove(permission);
        await this.role.setPermissions(currentPerm, reason);
    }
    public async checkPermission(permission: PermissionResolvable): Promise<boolean> {
        return this.role.permissions.has(permission);
    }
}


export { userRoleManager, serverRoleManager, roleManager };