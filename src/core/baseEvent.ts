import { DiscordClient } from "./DiscordClient";

/**
 * base Class for events/callbacks functions
 * @property {DiscordClient} client - Core Client
 * @method registerEvents - Register the events
 */
export abstract class baseEvent {
    abstract client: DiscordClient;
    abstract registerEvents(): void;
}