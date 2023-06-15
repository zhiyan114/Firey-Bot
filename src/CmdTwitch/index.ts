import { ChatUserstate, Client } from "tmi.js";
export type stringObject = {
    [key: string]: string
}
export type tmiTypes = {
    channel: string;
    user: ChatUserstate;
    message: string;
    self: boolean;
    client: Client;
    args: string[];
}
export type twitchCmdType = {
    name: string; // Command Name
    func(data: tmiTypes): Promise<any>; // Command execution
    disabled?: boolean; // Is the command disabled
}