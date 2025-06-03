import { DiscordCommandHandler } from '../../src/events/helper/DiscordCommandHandler';
import { SlashCommandOptionsOnlyBuilder } from 'discord.js';

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

describe("Duplcation Checks", ()=> {
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
})