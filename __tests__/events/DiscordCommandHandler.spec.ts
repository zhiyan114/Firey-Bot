import { DiscordCommandHandler } from '../../src/events/helper/DiscordCommandHandler';
import { SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from 'discord.js';

const mockClient = jest.fn().mockImplementation(() => {
  return {
    config: {
      guildID: '123456789012345678',
      adminRoleID: '987654321098765432',
      newUserRoleID: '112233445566778899',
    }
  }
});
const handler = new DiscordCommandHandler(mockClient());

describe("Duplication Checks", ()=> {
  const commands = handler.availableCommands;
  test("Name/Description should not be duplicated", () => {
    for(let i = 0; i < commands.length; i++) {
      const command = commands[i].metadata as SlashCommandOptionsOnlyBuilder;
      for(let j = i + 1; j < commands.length; j++) {
        const otherCommand = commands[j].metadata as SlashCommandOptionsOnlyBuilder;
        expect(command.name).not.toBe(otherCommand.name);
        expect(command.description).not.toBe(otherCommand.description);
      }
    }
  })

  test("Validate Name/Description length and format", ()=> {
    for(const { metadata } of handler.availableCommands) {
      expect(metadata.name).toMatch(/^[a-z0-9_-]{1,32}$/);
      if(metadata instanceof SlashCommandBuilder)
        expect(metadata.description).toMatch(/^[^\n]{1,100}$/)
    }
  })

  test("Validate Slash Command Options Name/Description", () => {
    for(const { metadata } of handler.availableCommands) {
      if(!(metadata instanceof SlashCommandBuilder))
        continue;
      const opts = metadata.options.map(k=>k.toJSON());
      for(const opt of opts) {
        expect(opt.name).toMatch(/^[a-z0-9_-]{1,32}$/)
        expect(opt.description).toMatch(/^[^\n]{1,100}$/)
      }
    }
  })
})