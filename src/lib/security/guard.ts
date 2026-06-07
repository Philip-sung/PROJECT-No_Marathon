import 'server-only';
import { NextResponse } from 'next/server';
import { rateLimit, RATE_WINDOW_MS } from '@/lib/security/rate-limit';
import { deviceHashFromRequest } from '@/lib/identity/device';
import { logger } from '@/lib/observability/logger';

/**
 * 요청을 기기 기준으로 rate limit. 초과 시 429 응답을 반환(아니면 null).
 */
export function rateLimitOr429(
  request: Request,
  name: string,
  limit: number,
): NextResponse | null {
  const key = `${name}:${deviceHashFromRequest(request.headers)}`;
  const result = rateLimit(key, limit, RATE_WINDOW_MS, Date.now());
  if (result.ok) {
    return null;
  }
  logger.warn('rate_limited', { route: name });
  return NextResponse.json(
    { error: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSec) } },
  );
}
