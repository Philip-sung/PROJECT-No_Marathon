import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminAuthorized } from '@/lib/admin/auth';
import { deleteMarathon } from '@/lib/agent/repo';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({ id: z.string() });

/** 관리자: 마라톤 하드 삭제(행 제거 + FK cascade 로 댓글·불편 함께 삭제). 되돌릴 수 없음. */
export async function POST(request: Request) {
  if (!isAdminAuthorized(request.headers)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '입력이 올바르지 않습니다.', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const ok = await deleteMarathon(parsed.data.id);
  if (!ok) {
    return NextResponse.json(
      { error: '해당 마라톤을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
