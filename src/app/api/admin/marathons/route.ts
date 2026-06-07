import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin/auth';
import { listAllMarathons } from '@/lib/agent/repo';

export const dynamic = 'force-dynamic';

/** 관리자: 전체 마라톤(staging/published/archived) 조회. */
export async function GET(request: Request) {
  if (!isAdminAuthorized(request.headers)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }
  const marathons = await listAllMarathons();
  return NextResponse.json({ marathons });
}
