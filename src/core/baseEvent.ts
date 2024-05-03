import { DiscordClient } from "./DiscordClient";
import { TwitchClient } from "./TwitchClient";
import { YoutubeClient } from "./YoutubeClient";

/**
 * base Class for events/callbacks functions
 * @property {DiscordClient} client - Core Client
 * @method registerEvents - Register the events
 */
export abstract class baseEvent {
    abstract client: DiscordClient;
    abstract registerEvents(): void;
}

/**
 * base Class for twitch events/callbacks functions
 * @property {TwitchClient} client - Twitch Client
 * @method registerEvents - Register the events
 */
export abstract class baseTEvent {
    abstract client: TwitchClient;
    abstract registerEvents(): void;
}

/**
 * base Class for youtube events/callbacks functions
 * @property {YoutubeClient} client - Youtube Client
 * @method registerEvents - Register the events
 */
export abstract class baseYEvent {
    abstract client: YoutubeClient;
    abstract registerEvents(): void;
}