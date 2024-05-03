import { baseTCommand, tmiTypes } from "../../core/baseCommand";

export class LurkCommand extends baseTCommand {
  public name = "lurk";
  public async execute(data: tmiTypes) {
    return data.client.say(data.channel, `@${data.user.username} is now lurking in the shadows!`);
  }
}