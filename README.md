# Firey-Bot Internal Documentation
This bot is developed to serve a single server; thus, codes are not reusable without modification.

[![CodeFactor](https://www.codefactor.io/repository/github/zhiyan114/firey-bot/badge)](https://www.codefactor.io/repository/github/zhiyan114/firey-bot)
[![DeepSource](https://deepsource.io/gh/zhiyan114/Firey-Bot.svg/?label=active+issues&show_trend=true&token=3NodfB5RfVFfrGbXlb3fV6t-)](https://deepsource.io/gh/zhiyan114/Firey-Bot/?ref=repository-badge)
[![DeepSource](https://deepsource.io/gh/zhiyan114/Firey-Bot.svg/?label=resolved+issues&show_trend=true&token=3NodfB5RfVFfrGbXlb3fV6t-)](https://deepsource.io/gh/zhiyan114/Firey-Bot/?ref=repository-badge)

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
    * `userReport` - Enables user to report software bug via sentry user-feedback


## Add commands
All commands are in their respective folders under `src/commands`. To add commands, please make sure to update index.ts and inside `src/events/helper`.

To ensure command is compatible, import `baseCommand` from core (or `baseTCommand` for twitch commands)