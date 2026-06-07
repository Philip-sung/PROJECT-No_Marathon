import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminAuthorized } from '@/lib/admin/auth';
import { updateMarathon } from '@/lib/agent/repo';
import { AdminMarathonPatchSchema } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  id: z.string(),
  patch: AdminMarathonPatchSchema,
});

/** 관리자: 마라톤 정보 수정(필드/상태 패치). */
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
  const ok = await updateMarathon(parsed.data.id, parsed.data.patch);
  if (!ok) {
    return NextResponse.json(
      { error: '해당 마라톤을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
