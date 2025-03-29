// We're gonna test all the config params...
import {
    guildID,
    adminRoleID,
    newUserRoleID,
    welcomeChannelID,
    logChannelID,
    generalChannelID,
    redisPrefix,
    noPoints,
    VCJoinLog,
    youtube,
    twitch,
    reactRoles
} from '../src/config.json';

function isNumberOnlyString(value: string): boolean {
  return typeof(value) === "string" && /^\d+$/.test(value);
}

describe("Top Level Config Values", () => {
    test("guildID should be number string", () => expect(isNumberOnlyString(guildID)).toBe(true));
    test("adminRoleID should be number string", () => expect(isNumberOnlyString(adminRoleID)).toBe(true));
    test("newUserRoleID should be number string", () => expect(isNumberOnlyString(newUserRoleID)).toBe(true));
    test("welcomeChannelID should be number string", () => expect(isNumberOnlyString(welcomeChannelID)).toBe(true));
    test("logChannelID should be number string", () => expect(isNumberOnlyString(logChannelID)).toBe(true));
    test("generalChannelID should be number string", () => expect(isNumberOnlyString(generalChannelID)).toBe(true));
    test("redisPrefix should be a string", () => expect(typeof(redisPrefix)).toBe("string"));
});

describe("noPoints subconfig values", () => {
    test("channel is a array", () => expect(Array.isArray(noPoints.channel)).toBe(true));
    test("channel array only containing isNumberOnlyString", () => {
        for(const value of noPoints.channel)
            expect(isNumberOnlyString(value)).toBe(true)
    });
    test("category is a array", () => expect(Array.isArray(noPoints.category)).toBe(true));
    test("category array only containing isNumberOnlyString", () => {
        for(const value of noPoints.category)
            expect(isNumberOnlyString(value)).toBe(true)
    });
});

describe("VCJoinLog subconfig values", () => {
    test("channelID should be number string", () => expect(isNumberOnlyString(VCJoinLog.channelID)).toBe(true));
    test("excludeChannels is a array", () => expect(Array.isArray(VCJoinLog.excludeChannels)).toBe(true));
    test("excludeChannels array only containing isNumberOnlyString", () => {
        for(const value of VCJoinLog.excludeChannels)
            expect(isNumberOnlyString(value)).toBe(true)
    });
});

describe("youtube subconfig values", () => {
    test("youtubeChannelID should be a string", () => expect(typeof(youtube.youtubeChannelID)).toBe("string"));
    test("guildChannelID should be number string", () => expect(isNumberOnlyString(youtube.guildChannelID)).toBe(true));
    test("pingRoleID should be a number string", () => expect(isNumberOnlyString(youtube.pingRoleID)).toBe(true));
    test("overridePort should be a number", () => expect(typeof(youtube.overridePort)).toBe("number"));
});

describe("twitch sub subconfig values", () => {
    test("prefix should be a string type", () => expect(typeof(twitch.prefix)).toBe("string"));
    test("prefix should only contain 1 character", () => expect(twitch.prefix.length).toBe(1));
    test("channel should be a string", () => expect(typeof(twitch.channel)).toBe("string"));
    describe("twitch notification subconfig values", () => {
        test("channelID should be number string", () => expect(isNumberOnlyString(twitch.notification.channelID)).toBe(true));
        test("roleToPing should be number string", () => expect(isNumberOnlyString(twitch.notification.roleToPing)).toBe(true));
        test("inviteRemindExpire should be a number", () => expect(typeof(twitch.notification.inviteRemindExpire)).toBe("number"));
    });
});

describe("reactRoles subconfig values", () => {
    test("reactionLists should be a array", () => expect(Array.isArray(reactRoles.reactionLists)).toBe(true));
    describe("Check reactionLists's item validity", () => {
        test("item should have Name (string)", () => {
            for(const item of reactRoles.reactionLists) {
                expect(item.Name).toBeDefined();
                expect(typeof(item.Name)).toBe("string");
            }
        });
        test("item should have EmoteID (stringNumber)", () => {
            for(const item of reactRoles.reactionLists) {
                expect(item.EmoteID).toBeDefined();
                expect(isNumberOnlyString(item.EmoteID)).toBe(true);
            }
        });
        test("item should have RoleID (stringNumber)", () => {
            for(const item of reactRoles.reactionLists) {
                expect(item.RoleID).toBeDefined();
                expect(isNumberOnlyString(item.RoleID)).toBe(true);
            }
        });
    });
    test("channelID should be number string", () => expect(isNumberOnlyString(reactRoles.channelID)).toBe(true));
    test("Description should be a string", () => expect(typeof(reactRoles.Description)).toBe("string"));
});