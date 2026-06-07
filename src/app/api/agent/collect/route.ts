import { NextResponse } from 'next/server';
import { isAgentAuthorized } from '@/lib/agent/auth';
import { runCollection } from '@/lib/agent/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * L1 Heartbeat 엔드포인트. cron/webhook 이 x-agent-secret 과 함께 호출.
 * 예) crontab 에서 30분마다:
 *   30분주기 cron 표현식 다음에
 *   curl -XPOST -H "x-agent-secret: $S" https://no-marathon.kr/api/agent/collect
 */
export async function POST(request: Request) {
  if (!isAgentAuthorized(request.headers)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }
  const result = await runCollection();
  return NextResponse.json(result);
}
