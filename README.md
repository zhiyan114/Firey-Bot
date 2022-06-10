# Firey-Bot Internal Documentation
This is an internal documentation for better maintainability. WARNING: THIS PRODUCT HAS BEEN PROTECTED UNDER THE COPYRIGHT ACT, IF ANY MATERIAL IS BEING USED WITHOUT AUTHORIZATION EVEN IF IT UNDER FAIR USE, YOU WILL BE SUED.


# Organization Standard
* All source are organized inside `src` folder. Any non-source code should be outside of that folder and organized accordingly.
* Inside the source, all user executable command should be stored under `src/commands` folder. This include administrative command and user interactable.
* Any service related module should be stored under `src/services` folder. Services is any module that is executed once by the `src/index.ts` and will continue to operate independently. This is solely for the purpose of maintainability.
* Any modules that are reusable or act as a utilty (such as a module to handle certain operation even if it only used once) should be placed under `src/utils`
* `dist` folder should be made available for compiled sources
* `src/index.ts` should only be used for essential client initialization and even listeners which should be passed to `services` for further operations
* `src/interface.ts` should only contain exportable interfaces that will be used throughout multiple other modules

# Configuration Guide
File: config.json
* clientID - This should be the Client/Application ID for the discord bot. This will only be used for slash command registration purpose.
* botToken - This should be the authentication token for the discord bot. This token will be used for all API calls.
* guildID - This is the guild ID which the bot will operate in (this bot is intended to operate in one server at a time) 
* webServer - Configuration for WebServer
    * FQDN - Full Qualified Domain Name for the server
    * https - This should be used for secure websocket and REST request (if either option is empty, an insecured HTTP will be launched instead)
    * webServerPort - Custom Port for the webserver (regardless if it http or https mode)
* newUserRoleID - role ID for the new user role
* welcomeChannelID - Channel to send welcome message to for new user
* logChannelID - Channel to send all the internal log information
    * certificate - Certificate (.crt/.cer) for HTTPS
    * key - Private key associated with the certificate
* youtubeNotification - Post a notification message to a guild channel when a youtube channel posted a new video
    * youtubeChannelID - The youtube channel which will be subscribing to
    * guildChannelID - The guild channel which the notification will be sent into
    * pingRoleID - Role to ping when a new video is posted
* reactionRole - Setup role reaction (user can react for roles)
    * reactionLists - A dictionary of reaction which the role will be given (`{"Emote ID": "Role ID"}`)
    * channelID - Channel which the reaction role exists in (avoid enumerating through the list to find the channel)
    * messageID - The message which the reaction will be listening to
