/**
 * 수집 에이전트 가드레일 설정(PDF §12.4 cost guardrail 4단 + 품질/모델).
 * 단일 출처(SSOT). 운영 시 환경에 맞게 조정.
 */
export const AGENT_CONFIG = {
  // L1 per-call
  maxTokens: 2048,
  // L2 per-session(이번 run)
  sessionBudgetUsd: 0.5,
  maxTargetsPerRun: 10,
  // L3 per-day
  dailyQuotaUsd: 5.0,
  // L4 anomaly circuit breaker
  maxFailureRate: 0.5, // run 내 실패율이 이 값을 넘으면 중단+escalate
  // 품질 게이트(LLM-as-judge)
  qualityThreshold: 7.0,
  // 수집 즉시 자동 게시(true) — 사람 검수(staging) 생략. 품질 게이트는 그대로 유지.
  // false 면 staging 까지만 적재하고 /admin 에서 수동 게시(ADR-007 원안).
  autoPublish: true,

  // worker 는 web_search(서버 도구)를 쓰므로 이를 지원하는 Sonnet 사용.
  // judge 는 검색 불필요 → Sonnet 으로 채점.
  workerModel: 'claude-sonnet-4-6',
  judgeModel: 'claude-sonnet-4-6',
} as const;

/** 서버사이드 웹 검색 도구(실제 정보 수집용). */
export const WEB_SEARCH_TOOL = {
  type: 'web_search_20260209',
  name: 'web_search',
} as const;

/** 모델별 100만 토큰당 단가(USD). 비용 추정용(대략치). */
export const MODEL_PRICING: Record<string, { input: number; output: number }> =
  {
    'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
    'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
    'claude-opus-4-8': { input: 15.0, output: 75.0 },
  };

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = MODEL_PRICING[model] ?? { input: 3.0, output: 15.0 };
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}
