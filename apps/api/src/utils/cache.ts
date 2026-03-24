/**
 * Simple in-memory cache utility with TTL and quota-aware error handling
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Cache key identifier */
  key: string;
}

const cache = new Map<string, CacheEntry<unknown>>();

// Circuit breaker: track quota exhaustion globally
let quotaExhausted = false;
let quotaExhaustedAt = 0;
const QUOTA_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown after quota error

function isQuotaExhausted(): boolean {
  if (!quotaExhausted) return false;

  // Reset after cooldown period
  if (Date.now() - quotaExhaustedAt > QUOTA_COOLDOWN) {
    console.log('[cache] Quota cooldown expired, resuming Firestore queries');
    quotaExhausted = false;
    return false;
  }

  return true;
}

function markQuotaExhausted(): void {
  if (!quotaExhausted) {
    console.error('[cache] ⚠️  FIRESTORE QUOTA EXHAUSTED - Entering 5-minute cooldown');
    quotaExhausted = true;
    quotaExhaustedAt = Date.now();
  }
}

/**
 * Wrapper for Firestore queries with automatic caching and quota handling
 *
 * @example
 * const users = await withCache(
 *   () => db.collection('users').get(),
 *   { key: 'all-users', ttl: 5 * 60 * 1000 }
 * );
 */
export async function withCache<T>(
  fetcher: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  const { key, ttl } = options;

  // Check cache first
  const cached = cache.get(key) as CacheEntry<T> | undefined;
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  // Circuit breaker: if quota is exhausted, return stale cache immediately
  if (isQuotaExhausted()) {
    if (cached) {
      console.warn(`[cache] Quota exhausted globally, returning stale cache for "${key}"`);
      return cached.data;
    }
    const cooldownErr = Object.assign(
      new Error('Firestore quota exhausted. System in cooldown. Try again in a few minutes.'),
      { status: 429 },
    );
    throw cooldownErr;
  }

  try {
    const data = await fetcher();

    // Update cache
    cache.set(key, { data, timestamp: Date.now() });

    return data;
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };

    // Handle Firestore quota exhaustion
    if (err.code === 8 || (err.message && err.message.includes('RESOURCE_EXHAUSTED'))) {
      markQuotaExhausted();

      // If we have stale cached data, return it
      if (cached) {
        console.warn(`[cache] Quota exceeded for key "${key}", returning stale cache`);
        return cached.data;
      }

      // No cache available — throw with 429 status so routes can forward it
      const quotaErr = Object.assign(
        new Error('Firestore quota exceeded. Please try again later.'),
        { status: 429 },
      );
      throw quotaErr;
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Invalidate cache for a specific key
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache entries whose key starts with the given prefix
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Check if an error is a quota/rate-limit error thrown by withCache.
 * Use in route catch blocks to return 429 instead of 500.
 */
export function isQuotaError(err: unknown): boolean {
  const e = err as { status?: number };
  return e?.status === 429;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
  quotaExhausted: boolean;
  quotaCooldownRemaining: number;
} {
  const cooldownRemaining = quotaExhausted
    ? Math.max(0, QUOTA_COOLDOWN - (Date.now() - quotaExhaustedAt))
    : 0;

  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
    quotaExhausted,
    quotaCooldownRemaining: Math.ceil(cooldownRemaining / 1000), // seconds
  };
}
