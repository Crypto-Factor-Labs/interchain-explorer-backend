import type { Store, StoreConfig } from 'cache-manager';

declare module 'cache-manager' {
  export interface Cache {
    /**
     * Get a value from the cache.
     * @returns the value or undefined if missing
     */
    get<T>(key: string): Promise<T | undefined>;

    /**
     * Set a value in the cache with an optional TTL.
     * @param optionsOrTtl either a number (seconds) or { ttl: number }
     */
    set<T>(
      key: string,
      value: T,
      optionsOrTtl?: number | { ttl: number }
    ): Promise<void>;

    /** Delete a key */
    del(key: string): Promise<void>;

    /** Clear the entire cache */
    reset(): Promise<void>;

    /** (Optional) access the underlying store */
    store?: Store;
  }

  // If you need the `caching()` factory:
  export function caching<C extends StoreConfig>(opts: C): Cache & Store;
}
