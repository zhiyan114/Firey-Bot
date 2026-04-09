import type { baseClient } from "./baseClient.js";


/**
 * base Class for discord events/callbacks functions
 * @property {DiscordClient} client - Core Client
 * @method registerEvents - Register the events
 */
export abstract class baseEvent {
    readonly abstract client: baseClient;
    abstract registerEvents(): void;
}