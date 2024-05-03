
/**
 * Abstract class for base client
 */
export abstract class baseClient {
    public abstract start(...args: unknown[]): void;
    public abstract dispose(): void;
}