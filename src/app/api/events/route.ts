import { NextResponse } from 'next/server';
import { EventInputSchema } from '@/lib/db/schema';
import { writeEvent } from '@/lib/data/mutations';
import { deviceHashFromRequest } from '@/lib/identity/device';
import { rateLimitOr429 } from '@/lib/security/guard';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/** 분석 이벤트 적재(자산화 헤지). 실패해도 사용자 흐름 방해 안 함. */
export async function POST(request: Request) {
  const limited = rateLimitOr429(request, 'events', RATE_LIMITS.events);
  if (limited) {
    return limited;
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = EventInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid event' }, { status: 400 });
  }
  const deviceHash = deviceHashFromRequest(request.headers);
  try {
    await writeEvent(parsed.data, deviceHash);
  } catch {
    // 분석 적재 실패는 조용히 무시.
  }
  return NextResponse.json({ ok: true });
}
