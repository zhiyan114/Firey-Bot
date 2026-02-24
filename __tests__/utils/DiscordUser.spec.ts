import { DiscordUser } from "../../src/utils/DiscordUser";
import type { User } from "discord.js";

// Mock Sentry to avoid side effects
jest.mock("@sentry/node-core", () => ({
  captureException: jest.fn(),
  metrics: { count: jest.fn() },
}));

// Minimal ServiceClient mock with redis & prisma stubs
const mockService = {
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
};

// Minimal discord.js User mock (bot must be false)
const mockUser = {
  bot: false,
  id: "123456789012345678",
  username: "testuser",
  discriminator: "0",
  displayName: "Test User",
  tag: "testuser#0",
  send: jest.fn(),
} as unknown as User;

let handler: DiscordUser;

beforeEach(() => {
  handler = new DiscordUser(mockService as any, mockUser);
});

describe("chatRewardPoints Eligibility Condition", () => {
  // Helper: make getCacheData return data with no cooldown
  function stubCacheReady(points = 100) {
    jest.spyOn(handler, "getCacheData").mockResolvedValue({
      points,
      lastgrantedpoint: new Date(0), // long past → cooldown satisfied
    });
    jest.spyOn(handler, "updateCacheData").mockResolvedValue();
    // Prevent actual DB call inside grantPoints
    mockService.prisma.members.update.mockResolvedValue({
      points: points + 5,
      lastgrantedpoint: new Date(),
    });
  }

  // --- Eligible messages ---
  const eligibleCases: [string, string][] = [
    ["normal text message", "Hello everyone, how are you doing today?"],
    ["message with link and enough text", "Check out this cool article https://example.com it explains everything"],
    ["message with ping and enough text", "<@!123456789012345678> hey can you help me with this problem please"],
    ["message with emoji and enough text", "😀 I am so happy about this awesome update"],
    ["message with custom emoji and enough text", "<:pepega:123456789012345678> that was a really funny moment"],
    ["ping + link + emoji with enough text", "<@!123456789012345678> look at this 😀 https://example.com I think it is really interesting"],
    ["message with role ping and enough text", "<@&123456789012345678> reminder that the event starts tomorrow morning"],
  ];

  it.each(eligibleCases)(
    "should grant points for %s",
    async (_label, text) => {
      stubCacheReady();
      const result = await handler.economy.chatRewardPoints(text);
      expect(result).toBe(true);
    },
  );

  it("should reject when cooldown has not elapsed", async () => {
    jest.spyOn(handler, "getCacheData").mockResolvedValue({
      points: 100,
      lastgrantedpoint: new Date(), // just now → still on cooldown
    });
    jest.spyOn(handler, "updateCacheData").mockResolvedValue();
    const result = await handler.economy.chatRewardPoints("Hello everyone, how are you doing today?");
    expect(result).toBe(false);
  });

  it("should bypass cooldown when ignoreCooldown is true", async () => {
    stubCacheReady();
    jest.spyOn(handler, "getCacheData").mockResolvedValue({
      points: 100,
      lastgrantedpoint: new Date(), // still on cooldown
    });
    const result = await handler.economy.chatRewardPoints(
      "Hello everyone, how are you doing today?",
      true, // ignoreCooldown
    );
    expect(result).toBe(true);
  });

  // --- Ineligible messages ---
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

  it.each(ineligibleCases)(
    "should reject message that is %s",
    async (_label, text) => {
      stubCacheReady();
      const result = await handler.economy.chatRewardPoints(text);
      expect(result).toBe(false);
      expect(handler.updateCacheData).toHaveBeenCalled();
    },
  );

  it("should return false when getCacheData returns undefined", async () => {
    jest.spyOn(handler, "getCacheData").mockResolvedValue(undefined);
    const result = await handler.economy.chatRewardPoints("Hello everyone, how are you today?");
    expect(result).toBe(false);
  });
});

