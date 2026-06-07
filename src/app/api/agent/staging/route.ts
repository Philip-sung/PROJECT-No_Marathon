import { NextResponse } from 'next/server';
import { isAgentAuthorized } from '@/lib/agent/auth';
import { listStaging } from '@/lib/agent/repo';

export const dynamic = 'force-dynamic';

/** 검수 대기(staging) 목록 — 개발자 검수용. */
export async function GET(request: Request) {
  if (!isAgentAuthorized(request.headers)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }
  const staging = await listStaging();
  return NextResponse.json({ staging });
}
