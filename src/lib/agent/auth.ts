import 'server-only';
import { serverEnv } from '@/lib/env.server';

/**
 * 수집 에이전트 엔드포인트 인증(L1 트리거 보호).
 * AGENT_TRIGGER_SECRET 이 설정되면 x-agent-secret 헤더 일치 필요.
 * 미설정(dev)이면 허용 — 턴키 개발 편의.
 */
export function isAgentAuthorized(headers: Headers): boolean {
  const secret = serverEnv.AGENT_TRIGGER_SECRET;
  if (!secret) {
    return true;
  }
  return headers.get('x-agent-secret') === secret;
}
