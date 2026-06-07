import { NextResponse } from 'next/server';
import { ReportInputSchema } from '@/lib/db/schema';
import { writeReport } from '@/lib/data/mutations';
import { deviceHashFromRequest } from '@/lib/identity/device';
import { rateLimitOr429 } from '@/lib/security/guard';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { notify } from '@/lib/observability/notify';

export async function POST(request: Request) {
  const limited = rateLimitOr429(request, 'reports', RATE_LIMITS.reports);
  if (limited) {
    return limited;
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = ReportInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '신고 내용이 올바르지 않습니다.', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const deviceHash = deviceHashFromRequest(request.headers);
  await writeReport(parsed.data, deviceHash);
  // 개발자 알림(메일/Slack은 notify 가 처리, 미설정 시 로그만).
  await notify({
    level: 'info',
    title: '새 앱 불편신고',
    detail: parsed.data.body.slice(0, 200),
  });
  return NextResponse.json({ ok: true });
}
