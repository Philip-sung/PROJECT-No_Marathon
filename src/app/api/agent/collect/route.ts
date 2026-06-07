import { NextResponse } from 'next/server';
import { isAgentAuthorized } from '@/lib/agent/auth';
import { runCollection } from '@/lib/agent/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 웹검색 포함 수집은 시간이 걸릴 수 있음

/**
 * L1 Heartbeat 엔드포인트. cron/webhook 이 x-agent-secret 과 함께 호출.
 * live 에서는 worker 가 web_search 로 실제 정보를 수집한다(하루 1회 권장).
 * 예) crontab 매일 04:00:
 *   0 4 * * *  다음 줄의 curl 호출
 *   curl -XPOST -H "x-agent-secret: $S" https://no-marathon.kr/api/agent/collect
 */
export async function POST(request: Request) {
  if (!isAgentAuthorized(request.headers)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }
  const result = await runCollection();
  return NextResponse.json(result);
}
