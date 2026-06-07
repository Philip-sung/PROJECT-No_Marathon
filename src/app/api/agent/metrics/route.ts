import { NextResponse } from 'next/server';
import { isAgentAuthorized } from '@/lib/agent/auth';
import { collectionMetrics } from '@/lib/agent/repo';

export const dynamic = 'force-dynamic';

/** 수집/분석 메트릭(관측성 L2, execution ledger 파생). */
export async function GET(request: Request) {
  if (!isAgentAuthorized(request.headers)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const metrics = await collectionMetrics(todayPrefix);
  return NextResponse.json(metrics);
}
