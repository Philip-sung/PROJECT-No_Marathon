import 'server-only';

/**
 * 인메모리 고정 윈도우 rate limiter(어뷰즈 방어, L4).
 * 프로세스 메모리 기반(Vultr 단일 인스턴스 가정). 다중 인스턴스 시 Redis 로 교체.
 */
interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): RateLimitResult {
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfterSec: 0 };
}

/** 라우트별 기본 한도(1분 윈도우). */
export const RATE_LIMITS = {
  disruptions: 5,
  comments: 10,
  like: 30,
  reports: 3,
  events: 60,
} as const;

export const RATE_WINDOW_MS = 60_000;
