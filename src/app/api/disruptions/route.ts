import { NextResponse } from 'next/server';
import { DisruptionInputSchema } from '@/lib/db/schema';
import { writeDisruption } from '@/lib/data/mutations';
import { deviceHashFromRequest } from '@/lib/identity/device';
import { rateLimitOr429 } from '@/lib/security/guard';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  const limited = rateLimitOr429(
    request,
    'disruptions',
    RATE_LIMITS.disruptions,
  );
  if (limited) {
    return limited;
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = DisruptionInputSchema.safeParse(body);
  if (!parsed.success) {
    // 과도입력 필터(min/max) 포함 서버 검증 실패.
    return NextResponse.json(
      { error: '입력이 올바르지 않습니다.', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const deviceHash = deviceHashFromRequest(request.headers);
  await writeDisruption(parsed.data, deviceHash);
  return NextResponse.json({ ok: true });
}
