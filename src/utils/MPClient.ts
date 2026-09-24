import { startNewTrace, withIsolationScope } from "@sentry/node";
import { type ClientEvents, GuildMember, User } from "discord.js";
import type { EventEmitter } from "stream";
import type { Client } from "tmi.js";
import { adminRoleID, VIPUserRoleID, newUserRoleID } from "../config.json";

interface ExtractedUser {
  id: string;
  username: string;
  isStaff?: boolean | "unknown";
  isVIP?: boolean | "unknown";
  isVerified?: boolean | "unknown";
}

function discordDataHelper(data: User | GuildMember): ExtractedUser {
  const user = data instanceof User ? data : data.user;
  const userRoles = data instanceof GuildMember ? data.roles.cache : undefined;
  return {
    id: user.id,
    username: user.username,
    isStaff: userRoles?.some(k=> k.id === adminRoleID) ?? "unknown",
    isVIP: userRoles?.some(k => k.id === VIPUserRoleID) ?? "unknown",
    isVerified: userRoles?.some(k=> k.id === newUserRoleID) ?? "unknown"
  };
}

function getDiscordUserData(arg: unknown): ExtractedUser | undefined {
  // Check Self
  if(!arg || typeof arg !== "object") return;
  if(arg instanceof User || arg instanceof GuildMember)
    return discordDataHelper(arg);

  // Object check and get data as available
  if("member" in arg && arg.member instanceof GuildMember)
    return discordDataHelper(arg.member);
  if("author" in arg && arg.author instanceof User)
    return discordDataHelper(arg.author);
  if("user" in arg && arg.user instanceof User)
    return discordDataHelper(arg.user);
}

// Some Internals that's helpful to be patched
export function patchClient(client: EventEmitter | Client, platformName: string) {
  const oldEmit = client.emit;
  client.emit = function(event: string, ...args: ClientEvents[]) {
    return startNewTrace(() => withIsolationScope((scope)=>{
      scope.setTags({
        "platform": platformName,
        "eventType": event
      }).setAttributes({
        "platform": platformName,
        "eventType": event
      });

      if(platformName === "discord") {
        // Some event like "userUpdate" puts latest user info in the last
        // arg index and we perform reverse iteration in-case any specific
        // event only has user data near the origin (or index 0) of the array
        for(let i = args.length - 1; i >= 0; i--) {
          const user = getDiscordUserData(args[i]);
          if(user) {
            scope.setUser(user);
            break;
          }
        }
      }

      return oldEmit.call(client, event, ...args);
    }));
  };
}