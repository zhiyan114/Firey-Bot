//@ts-nocheck

import { TextChannel } from "discord.js";
import { DiscordClient } from "../../../src/core/DiscordClient";
import {eventLogger} from "../../../src/core/helper/eventLogger";

describe("Event Logger behavior", ()=> {
  const mockClient = jest.fn((): Partial<DiscordClient> => ({
    channels: {
      fetch: jest.fn(()=> {
        const channelMock = Object.create(TextChannel.prototype);
        return Promise.resolve(Object.assign(channelMock, {
          id: "67890",
          send: jest.fn(),
        }));
      })
    },
    config: {
      logChannelID: "12345"
    }
  }));


  test("Logger should initialize", async ()=> {

    const client = new mockClient() as DiscordClient;
    const logger = new eventLogger(client);
    await logger.initalize();

    expect(client.channels.fetch).toHaveBeenCalledWith("12345");
    expect(logger.logQueues.length).toBe(0);

    const sendLogSpy = jest.spyOn(logger, "sendLog");
    expect(sendLogSpy).not.toHaveBeenCalled();
  });

  test("Logger should send queue logs", async ()=> {

    const logCount = 10;
    const client = new mockClient() as DiscordClient;
    const logger = new eventLogger(client);

    for(let i=0; i<logCount; i++)
      await logger.sendLog({type: "Info", message: `Log ${i}`});
    expect(logger.logQueues.length).toBe(logCount);
    
    const spySendLog = jest.spyOn(logger, "sendLog");
    await logger.initalize();

    expect(client.channels.fetch).toHaveBeenCalledWith("12345");
    expect(logger.logQueues.length).toBe(0);
    expect(spySendLog).toHaveBeenCalledTimes(logCount);
  });
});