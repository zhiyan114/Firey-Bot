import { commands } from '../../src/events/helper/TwitchCommandHandler';

describe("Duplcation Checks", ()=> {
  test("Name should not be duplicated", () => {
    for(let i = 0; i < commands.length; i++) {
      const command = commands[i];
      for(let j = i + 1; j < commands.length; j++) {
        const otherCommand = commands[j];
        expect(command.name).not.toBe(otherCommand.name);
      }
    }
  })
})