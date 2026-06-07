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

  // 모델 tier 분리(PDF §7.2.2): worker=저비용, judge=중간.
  workerModel: 'claude-haiku-4-5-20251001',
  judgeModel: 'claude-sonnet-4-6',
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
