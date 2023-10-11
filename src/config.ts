// Enviornment variable first before using empty value or default value that you configured
export const clientID = process.env["CLIENTID"] || "";
export const botToken = process.env["BOTTOKEN"] || "";
export const guildID = "906899666656956436";
export const adminRoleID = "908090260087513098";
export const newUserRoleID = "907768073442983966";
export const welcomeChannelID = "907121158376288307";
export const logChannelID = "971584951076147261";
export const generalChannelID = "908069392384933938";
export const webServer = {
  FQDN: process.env["WEBSERVER_FQDN"] || "",
  Port: process.env["WEBSERVER_PORT"] ? parseInt(process.env["WEBSERVER_PORT"]) : undefined,
  https: {
    certificate: process.env["WEBSERVER_HTTPS_CERTIFICATE"],
    key: process.env["WEBSERVER_HTTPS_KEY"]
  }
};
export const youtubeNotification = {
  youtubeChannelID: "UCKsRmVfwU-IkVWhfiSVp1ig",
  guildChannelID: "912150616908890142",
  pingRoleID: "946613137031974963"
};
export const reactionRole = {
  reactionLists: {
    "907314933648199700": "908723067067437076",
    "941368077856161885": "946613137031974963"
  },
  channelID: "908719210040008755",
  messageID: "970021524763471893"
};
export const twitch = {
  prefix: "!",
  channel: "fireythealiendragon",
  discordChannelID: "908120379766231070",
  roleToPing: "908723067067437076",
  reminderInterval: 1800000, // 30 minutes
};
// List of channels to not grant points on (Channel ID)
export const noPointsChannel = [
  "907121158376288307"
];
// Whether the extra service should be enabled or not
export const enableExtra = {
  whisper: true
};