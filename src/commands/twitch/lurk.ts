import type { tmiTypes } from "../../core/baseCommand.js";
import { baseTCommand } from "../../core/baseCommand.js";

export class LurkCommand extends baseTCommand {
  public name = "lurk";
  public perm = [];
  public async execute(data: tmiTypes) {
    return await data.client.say(data.channel, `@${data.user.username} is now lurking in the shadows!`);
  }
}