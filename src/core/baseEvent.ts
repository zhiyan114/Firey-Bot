import { DiscordClient } from "./DiscordClient";

export abstract class baseEvent {
    abstract client: DiscordClient;
    abstract registerEvents(): void;
}