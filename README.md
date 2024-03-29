# Firey-Bot Internal Documentation
This bot is developed to serve a single server; thus, codes are not reusable without modification.

[![CodeFactor](https://www.codefactor.io/repository/github/zhiyan114/firey-bot/badge)](https://www.codefactor.io/repository/github/zhiyan114/firey-bot)
[![DeepSource](https://deepsource.io/gh/zhiyan114/Firey-Bot.svg/?label=active+issues&show_trend=true&token=3NodfB5RfVFfrGbXlb3fV6t-)](https://deepsource.io/gh/zhiyan114/Firey-Bot/?ref=repository-badge)
[![DeepSource](https://deepsource.io/gh/zhiyan114/Firey-Bot.svg/?label=resolved+issues&show_trend=true&token=3NodfB5RfVFfrGbXlb3fV6t-)](https://deepsource.io/gh/zhiyan114/Firey-Bot/?ref=repository-badge)



# Source Code Structure
* All source are organized inside `src` folder. Any non-source code should be outside of that folder and organized accordingly.
* Inside the source, all user executable command should be stored under `src/commands` folder. This include administrative command and user interactable.
* Any service related module should be stored under `src/services` folder. Services is any module that is executed once by the `src/index.ts` and will continue to operate independently. This is solely for the purpose of maintainability.
* Any modules that are reusable or act as a utilty (such as a module to handle certain operation even if it only used once) should be placed under `src/utils`
* Any component or utils that utilizes the database (except database.ts itself) will go under `src/DBUtils` (exception: If the component functions as a service defined above, keep it under that folder).
* `dist` folder should be made available for compiled sources
* `src/index.ts` should only be used for essential client initialization and even listeners which should be passed to `services` for further operations
* `src/interface.ts` should only contain exportable interfaces that will be used throughout multiple other modules

# Configuration Guide
File: config.ts

## Environment Variable
For environment variable configurations, please refer to the `.env.example` file

## Standard Configuration:
* `guildID` - The guild ID for the server that the bot will be running in. Yes, I can technically pull that ID out by getting a list of guilds that the bot is in and read the first array, but nah, I don't feel like doing that.
* `adminRoleID` - As the name suggested, the roles that the user will be in with moderation privileges. For commands like eval, they do have exceptions.
* `newUserRoleID` - Role the new user will get after confirming.
* `welcomeChannelID` - Place to announce new users.
* `logChannelID` - Channels to send internal logs.
* `generalChannelID` - A general purpose chat channel for interactive replies
* `youtubeNotification` - Youtube Notification Configuration (a sub-config)
    * `guildChannelID` - The ID of a guild's channel of where a new video will be posted
    * `pingRoleID` - The role to ping as a reminder
    * `youtubeChannelID` - The youtube channel which it will be listening to
* `reactionRole` - Disorganized reaction role system. IT was orginally developed without database in-mind because I didn't feel like setting them up.
    * `reactionLists` - Put all the reactions in an array format which each object as `{"Emote ID": "Role ID"}`
    * `ChannelID` - Which Channel is the reaction located. (To setup the reaction, look at the source on the top and use eval. This might change in the future)
    * `messageID` - The message ID which the reaction will be listening to. I could of use the same technique mentioned above but eh not feeling it.
* `twitch` - Twitch Bot configuration
    * `prefix` - Prefix to invoke the bot
    * `channel` - Twitch channel name that the bot will be listening in.
    * `discordChannelID` - The channel ID in discord to send the notification to
    * `roleToPing` - The role ID to ping when stream starts
    * `reminderInterval` - Interval to send a reminder for the discord server (in ms)
* `noPointsChannel` - A list of channels that the points will not be awarded to
* `enableExtra` - A list of extra services that can either be enabled or disabled
    * `whisper` - OpenAI Speech To Text Transcriber