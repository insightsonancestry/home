/**
 * In-memory sliding window rate limiter.
 *
 * Each limiter tracks requests per key (IP or userId) within a time window.
 * Expired entries are lazily cleaned up.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 5 });
 *   const { allowed, remaining, retryAfterMs } = limiter.check(key);
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimiterConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Max requests per window */
  max: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface RateLimiter {
  check: (key: string) => RateLimitResult;
  reset: (key: string) => void;
}

const store = new Map<string, Map<string, RateLimitEntry>>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    store.forEach((limiterStore) => {
      const keys: string[] = [];
      limiterStore.forEach((_, k) => keys.push(k));
      keys.forEach((key) => {
        const entry = limiterStore.get(key);
        if (!entry) return;
        entry.timestamps = entry.timestamps.filter((t) => now - t < 600_000);
        if (entry.timestamps.length === 0) limiterStore.delete(key);
      });
    });
  }, 60_000);
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const id = `${config.windowMs}:${config.max}:${Math.random()}`;
  const limiterStore = new Map<string, RateLimitEntry>();
  store.set(id, limiterStore);
  ensureCleanup();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = limiterStore.get(key) || { timestamps: [] };

      // Remove timestamps outside window
      entry.timestamps = entry.timestamps.filter((t) => now - t < config.windowMs);

      if (entry.timestamps.length >= config.max) {
        const oldest = entry.timestamps[0];
        const retryAfterMs = config.windowMs - (now - oldest);
        return { allowed: false, remaining: 0, retryAfterMs };
      }

      entry.timestamps.push(now);
      limiterStore.set(key, entry);

      return {
        allowed: true,
        remaining: config.max - entry.timestamps.length,
        retryAfterMs: 0,
      };
    },

    reset(key: string) {
      limiterStore.delete(key);
    },
  };
}

/**
 * Extract a rate limit key from a request.
 * Uses X-Forwarded-For (behind proxy) or falls back to a generic key.
 */
export function getIpFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
