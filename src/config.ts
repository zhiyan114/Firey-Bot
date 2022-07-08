// Type definition if you want to default this lmao
export type Config = {
    clientID: string,
    botToken: string,
    guildID: string,
    adminRoleID: string,
    newUserRoleID: string,
    welcomeChannelID: string,
    logChannelID: string,
    webServer: {
        FQDN: string,
        webServerPort: number | undefined,
        https: {
            certificate: string | undefined,
            key: string | undefined,
        }
    },
    youtubeNotification: {
        youtubeChannelID: string,
        guildChannelID: string,
        pingRoleID: string,
    }
    reactionRole: {
        reactionLists: {
            [key: string]: string,
        },
        channelID: string,
        messageID: string,
    }
}

// Enviornment variable first before using empty value or default value that you configured
export const clientID = process.env['CLIENTID'] || "";
export const botToken = process.env['BOTTOKEN'] || "";
export const guildID = process.env['GUILDID'] || "";
export const adminRoleID = process.env['ADMINROLEID'] || "";
export const newUserRoleID = process.env['NEWUSERROLEID'] || "";
export const welcomeChannelID = process.env['WELCOMECHANNELID'] || "";
export const logChannelID = process.env['LOGCHANNELID'] || "";
export const webServer = {
    FQDN: process.env['WEBSERVER_FQDN'] || "",
    Port: process.env["WEBSERVER_PORT"] ? parseInt(process.env["WEBSERVER_PORT"]) : undefined,
    https: {
        certificate: process.env['WEBSERVER_HTTPS_CERTIFICATE'],
        key: process.env['WEBSERVER_HTTPS_KEY']
    }
};
export const youtubeNotification = {
    youtubeChannelID: process.env['YOUTUBENOTIFICATION_YOUTUBECHANNELID'] || "",
    guildChannelID: process.env['YOUTUBENOTIFICATION_GUILDCHANNELID'] || "",
    pingRoleID: process.env['YOUTUBENOTIFICATION_PINGROLEID'] || ""
};
export const reactionRole = {
    reactionLists: JSON.parse(process.env['REACTIONROLE_REACTIONLISTS'] || "{}"),
    channelID: process.env['REACTIONROLE_CHANNELID'] || "",
    messageID: process.env['REACTIONROLE_MESSAGEID'] || ""
};