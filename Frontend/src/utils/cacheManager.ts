/**
 * SRCB EduAssess Universal High-Performance Cache Manager
 * Provides dual-layer caching (L1 Memory Map + L2 Session Storage)
 * Enables "load once, reuse instantly" across page clicks, tab navigation, and refreshes.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

const CACHE_PREFIX = "aero_omr_cache_";
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes default TTL

class CacheManager {
  // L1 In-Memory Cache (0ms synchronous access)
  private memoryCache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Check whether sessionStorage is available and accessible
   */
  private isStorageAvailable(): boolean {
    try {
      if (typeof window === "undefined" || !window.sessionStorage) return false;
      const testKey = "__cache_test__";
      window.sessionStorage.setItem(testKey, testKey);
      window.sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cached data synchronously. Checks L1 memory first, then L2 sessionStorage.
   * Returns null if missing or expired.
   */
  public get<T>(key: string): T | null {
    const now = Date.now();

    // 1. Check L1 Memory Cache
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!;
      if (now - entry.timestamp <= entry.ttlMs) {
        return entry.data as T;
      }
      // Expired in memory
      this.memoryCache.delete(key);
    }

    // 2. Check L2 SessionStorage Cache
    if (this.isStorageAvailable()) {
      try {
        const raw = window.sessionStorage.getItem(CACHE_PREFIX + key);
        if (raw) {
          const entry: CacheEntry<T> = JSON.parse(raw);
          if (now - entry.timestamp <= entry.ttlMs) {
            // Rehydrate into L1 memory for fast subsequent hits
            this.memoryCache.set(key, entry);
            return entry.data;
          }
          // Expired in session storage
          window.sessionStorage.removeItem(CACHE_PREFIX + key);
        }
      } catch (err) {
        console.warn(`[CacheManager] Failed to read ${key} from storage:`, err);
      }
    }

    return null;
  }

  /**
   * Store data in both L1 Memory and L2 SessionStorage
   */
  public set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };

    // Store in L1 Memory
    this.memoryCache.set(key, entry);

    // Store in L2 SessionStorage
    if (this.isStorageAvailable()) {
      try {
        window.sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
      } catch (err) {
        // Storage full or quota exceeded, clear stale entries
        console.warn(`[CacheManager] Storage write warning for ${key}:`, err);
      }
    }
  }

  /**
   * Check if a valid, non-expired cache entry exists for the key
   */
  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidate specific key or matching pattern
   */
  public invalidate(keyOrPattern: string | RegExp): void {
    // Invalidate L1 memory
    if (typeof keyOrPattern === "string") {
      this.memoryCache.delete(keyOrPattern);
    } else {
      for (const k of this.memoryCache.keys()) {
        if (keyOrPattern.test(k)) {
          this.memoryCache.delete(k);
        }
      }
    }

    // Invalidate L2 sessionStorage
    if (this.isStorageAvailable()) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const rawKey = window.sessionStorage.key(i);
          if (rawKey && rawKey.startsWith(CACHE_PREFIX)) {
            const actualKey = rawKey.substring(CACHE_PREFIX.length);
            if (
              typeof keyOrPattern === "string"
                ? actualKey === keyOrPattern
                : keyOrPattern.test(actualKey)
            ) {
              keysToRemove.push(rawKey);
            }
          }
        }
        keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
      } catch (err) {
        console.warn("[CacheManager] Error during cache invalidation:", err);
      }
    }
  }

  /**
   * Clear all cached data
   */
  public clear(): void {
    this.memoryCache.clear();
    if (this.isStorageAvailable()) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const rawKey = window.sessionStorage.key(i);
          if (rawKey && rawKey.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(rawKey);
          }
        }
        keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
      } catch (err) {
        console.warn("[CacheManager] Error during cache clear:", err);
      }
    }
  }

  /**
   * Helper to load data with cache and graceful human-paced transition.
   * If cached or fresh data resolves, provides a subtle smooth delay (default 260ms)
   * so the skeleton loader shimmer displays pleasantly and transitions softly.
   */
  public async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { forceRefresh?: boolean; ttlMs?: number; delayMs?: number }
  ): Promise<T> {
    const forceRefresh = options?.forceRefresh ?? false;
    const delayMs = options?.delayMs ?? 260; // 260ms smooth skeleton pacing

    if (!forceRefresh) {
      const cached = this.get<T>(key);
      if (cached !== null) {
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        return cached;
      }
    }

    // Cache miss or force refresh
    const [freshData] = await Promise.all([
      fetcher(),
      delayMs > 0 ? new Promise((resolve) => setTimeout(resolve, delayMs)) : Promise.resolve(),
    ]);

    if (freshData !== null && freshData !== undefined) {
      this.set(key, freshData, options?.ttlMs);
    }
    return freshData;
  }
}

export const cacheManager = new CacheManager();
export default cacheManager;
