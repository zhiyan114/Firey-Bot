import { DiscordUser } from "../../src/utils/DiscordUser";
import { svcClient } from "../../src/SharedClient";
import type { User } from "discord.js";

jest.mock("@sentry/node", () => ({
  captureException: jest.fn(),
  metrics: { count: jest.fn() },
  startSpan: jest.fn((_opts: unknown, cb: () => unknown) => cb()),
}));

jest.mock("../../src/SharedClient", () => ({
  svcClient: {
    redis: {
      exists: jest.fn().mockResolvedValue(0),
      hgetall: jest.fn().mockResolvedValue({}),
      hset: jest.fn().mockResolvedValue("OK"),
      hget: jest.fn().mockResolvedValue(null),
      expire: jest.fn().mockResolvedValue(1),
    },
    prisma: {
      members: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      modlog: { create: jest.fn() },
    },
  },
}));

const mockUser = {
  bot: false,
  id: "123456789012345678",
  username: "testuser",
  discriminator: "0",
  displayName: "Test User",
  tag: "testuser#0",
  send: jest.fn(),
} as unknown as User;

describe("chatRewardPoints Eligibility Condition", () => {
  let localHandler: DiscordUser;
  beforeEach(() => {
    const points = 100;
    localHandler = new DiscordUser(mockUser);

    jest.spyOn(localHandler, "getCacheData").mockResolvedValue({
      points,
      lastgrantedpoint: new Date(0),
    });
    jest.spyOn(localHandler, "updateCacheData").mockResolvedValue();
    (svcClient.prisma.members.update as jest.Mock).mockResolvedValue({
      points: points + 5,
      lastgrantedpoint: new Date(),
    });
  });

  /* RegEx Test Case */
  const eligibleCases: [string, string][] = [
    ["normal text message", "Hello everyone, how are you doing today?"],
    ["message with link and enough text", "Check out this cool article https://example.com it explains everything"],
    ["message with ping and enough text", "<@!123456789012345678> hey can you help me with this problem please"],
    ["message with emoji and enough text", "😀 I am so happy about this awesome update"],
    ["message with custom emoji and enough text", "<:pepega:123456789012345678> that was a really funny moment"],
    ["ping + link + emoji with enough text", "<@!123456789012345678> look at this 😀 https://example.com I think it is really interesting"],
    ["message with role ping and enough text", "<@&123456789012345678> reminder that the event starts tomorrow morning"],
  ];
  const ineligibleCases: [string, string][] = [
    ["too short", "hey"],
    ["numbers only", "1234567890"],
    ["special characters only", "!@#$%^&*()!"],
    ["text emoji only", ":smile: :wave: :heart:"],
    ["unicode emoji only", "😀 😃 😄 😁 😆"],
    ["discord custom emoji only", "<:pepega:123456789012345678> <a:catJAM:987654321098765432>"],
    ["mixed unicode and custom emoji", "😀 <:smile:123456789012345678> 🎉 <a:wave:987654321098765432>"],
    ["repeating characters", "aaaaaaaaaaaaa"],
    ["ping only", "<@!123456789012345678> <@!987654321098765432>"],
    ["link only", "https://example.com https://example.org"],
    ["emoji + ping + link padded (stripped length < 10)", "😀 <@!123456789012345678> https://example.com hey"],
    ["short real text buried in noise", "<:ok:123456789012345678> 🎉 hi <@!123456789012345678> https://x.com"],
  ];

  it.each(eligibleCases)(
    "should grant points for %s",
    async (_label, text) => {
      const result = await localHandler.economy.chatRewardPoints(text);
      expect(result).toBe(true);
    });

  it.each(ineligibleCases)(
    "should reject message that is %s",
    async (_label, text) => {
      const result = await localHandler.economy.chatRewardPoints(text);
      expect(result).toBe(false);
      expect(localHandler.updateCacheData).toHaveBeenCalled();
    });

  /* General behavior test case */
  it("should reject when cooldown has not elapsed", async () => {
    jest.spyOn(localHandler, "getCacheData").mockResolvedValue({
      points: 100,
      lastgrantedpoint: new Date(), // cache return cooldown
    });
    jest.spyOn(localHandler, "updateCacheData").mockResolvedValue();
    const result = await localHandler.economy.chatRewardPoints("Hello everyone, how are you doing today?");
    expect(result).toBe(false);
  });

  it("should bypass cooldown when ignoreCooldown is true", async () => {
    jest.spyOn(localHandler, "getCacheData").mockResolvedValue({
      points: 100,
      lastgrantedpoint: new Date(), // cache return cooldown
    });
    const result = await localHandler.economy.chatRewardPoints(
      "Hello everyone, how are you doing today?",
      true,
    );
    expect(result).toBe(true);
  });

  it("should return false when getCacheData returns undefined", async () => {
    jest.spyOn(localHandler, "getCacheData").mockResolvedValue(undefined);
    const result = await localHandler.economy.chatRewardPoints("Hello everyone, how are you today?");
    expect(result).toBe(false);
  });
});

