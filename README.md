# Firey-Bot Internal Documentation
This is an internal documentation for better maintainability.

[![CodeFactor](https://www.codefactor.io/repository/github/zhiyan114/firey-bot/badge/master?s=4eccfaa078509d205bc5fb5b76374c0972fb7fc2)](https://www.codefactor.io/repository/github/zhiyan114/firey-bot/overview/master)



# Organization Standard
* All source are organized inside `src` folder. Any non-source code should be outside of that folder and organized accordingly.
* Inside the source, all user executable command should be stored under `src/commands` folder. This include administrative command and user interactable.
* Any service related module should be stored under `src/services` folder. Services is any module that is executed once by the `src/index.ts` and will continue to operate independently. This is solely for the purpose of maintainability.
* Any modules that are reusable or act as a utilty (such as a module to handle certain operation even if it only used once) should be placed under `src/utils`
* `dist` folder should be made available for compiled sources
* `src/index.ts` should only be used for essential client initialization and even listeners which should be passed to `services` for further operations
* `src/interface.ts` should only contain exportable interfaces that will be used throughout multiple other modules

# Configuration Guide
File: config.ts

Environment Variable:
* CLIENTID - This should be the Client/Application ID for the discord bot. This will only be used for slash command registration purpose.
* BOTTOKEN - This should be the authentication token for the discord bot. This token will be used for all API calls.
* GUILDID - This is the guild ID which the bot will operate in (this bot is intended to operate in one server at a time) 
* WEBSERVER_FQDN - Full Qualified Domain Name for the server
* WEBSERVER_HTTPS_CERTIFICATE - Certificate (.crt/.cer) for HTTPS
* WEBSERVER_HTTPS_KEY - Private key associated with the certificate
* WEBSERVER_PORT - Custom Port for the webserver (regardless if it http or https mode)
* NEWUSERROLEID - role ID for the new user role
* WELCOMECHANNELID - Channel to send welcome message to for new user
* LOGCHANNELID - Channel to send all the internal log information
* YOUTUBENOTIFICATION_YOUTUBECHANNELID - The youtube channel which will be subscribing to
* YOUTUBENOTIFICATION_GUILDCHANNELID - The guild channel which the notification will be sent into
* YOUTUBENOTIFICATION_PINGROLEID - Role to ping when a new video is posted
* REACTIONROLE_REACTIONLISTS - A dictionary of reaction which the role will be given (`{"Emote ID": "Role ID"}`)
* REACTIONROLE_CHANNELID - Channel which the reaction role exists in (avoid enumerating through the list to find the channel)
* REACTIONROLE_MESSAGEID - The message which the reaction will be listening to
