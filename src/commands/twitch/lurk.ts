import type { tmiTypes } from "../../core/baseCommand";
import { baseTCommand } from "../../core/baseCommand";

export class LurkCommand extends baseTCommand {
  public name = "lurk";
  public perm = [];
  public async execute(data: tmiTypes) {
    return await data.client.say(data.channel, `@${data.user.username} is now lurking in the shadows!`);
  }
}