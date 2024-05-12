//@ts-nocheck

import { TextChannel } from "discord.js";
import { DiscordClient } from "../../../src/core/DiscordClient";
import {eventLogger} from "../../../src/core/helper/eventLogger";

describe("Event Logger behavior", ()=> {
  const mockClient = jest.fn((): Partial<DiscordClient> => ({
    channels: {
      fetch: jest.fn(()=> Promise.resolve(mockChannel()))
    },
    config: {
      logChannelID: "12345"
    }
  }));

  const mockChannel = jest.fn((): Partial<TextChannel> => {
    const channelMock = Object.create(TextChannel.prototype);
    return Object.assign(channelMock, {
      id: "67890",
      send: jest.fn((a)=> Promise.resolve(a)),
    });
  });


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

  test("sendLog should send log data", async ()=> {
    const logCount = 10;
    const client = new mockClient() as DiscordClient;
    const logger = new eventLogger(client);
    logger.channel = new mockChannel();
    const prepEmbedSpy = jest.spyOn(logger, "prepareEmbed");

    for(let i=0; i<logCount; i++)
      logger.sendLog({type: "Info", message: `Log ${i}`});

    expect(logger.channel.send).toHaveBeenCalledTimes(logCount);
    expect(prepEmbedSpy).toHaveBeenCalledTimes(logCount);

    let i = 0;
    for(const {value} of logger.channel.send.mock.results) {
      const data = await value;
      expect(data.content).toEqual(undefined);
      expect(data.embeds.length).toEqual(1);
      expect(data.embeds[0].data.title).toEqual("Info Log");
      expect(data.embeds[0].data.description).toEqual(`Log ${i++}`);
      expect(data.embeds[0].data.fields).toEqual(undefined);
    }


  });
  
});