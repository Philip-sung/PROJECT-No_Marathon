import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin/auth';
import { listAllMarathons, marathonEngagement } from '@/lib/agent/repo';

export const dynamic = 'force-dynamic';

/** 관리자: 전체 마라톤(staging/published/archived) + 마라톤별 참여 집계 조회. */
export async function GET(request: Request) {
  if (!isAdminAuthorized(request.headers)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }
  const [marathons, stats] = await Promise.all([
    listAllMarathons(),
    marathonEngagement(),
  ]);
  return NextResponse.json({ marathons, stats });
}
