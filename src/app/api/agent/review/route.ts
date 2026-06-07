import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAgentAuthorized } from '@/lib/agent/auth';
import { reviewMarathon } from '@/lib/agent/repo';

export const dynamic = 'force-dynamic';

const ReviewSchema = z.object({
  id: z.string(),
  action: z.enum(['publish', 'reject']),
});

/** 개발자 검수: staging 마라톤을 published 승격 또는 archived 반려. */
export async function POST(request: Request) {
  if (!isAgentAuthorized(request.headers)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'id 와 action(publish|reject) 이 필요합니다.' },
      { status: 400 },
    );
  }
  const ok = await reviewMarathon(parsed.data.id, parsed.data.action);
  if (!ok) {
    return NextResponse.json(
      { error: '해당 staging 항목을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
