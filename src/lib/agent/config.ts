/**
 * 수집 에이전트 가드레일 설정(PDF §12.4 cost guardrail 4단 + 품질/모델).
 * 단일 출처(SSOT). 운영 시 환경에 맞게 조정.
 */
export const AGENT_CONFIG = {
  // L1 per-call
  //
  // 호출 1회 worst-case = maxInputTokensPerCall×입력단가 + maxTokens×출력단가.
  //   Sonnet 기준: 50,000×$3/1M + 8,192×$15/1M = $0.15 + $0.123 ≈ $0.27/호출.
  // max_tokens 는 "천장"일 뿐 **실제 생성분만 과금**된다(8192 라도 출력 3k 면 3k 만 청구).
  // worker 는 "그 달 마라톤을 전부 열거"해 **배열**로 반환하므로, 2048 이면 여러 건이
  //   중간에 잘려(JSON.parse 실패=호출 통째 낭비) → 배열이 안 잘리게 8192 로 상향.
  //   (judge 는 단일 점수라 작아서 별도 512 — judge.ts 에서 직접 지정.)
  // 실효 비용 칼자루는 여전히 입력 상한(maxInputTokensPerCall) — 실측 피크 ~33k 에 1.5x.
  maxTokens: 8192,
  // 호출당 web_search 횟수 상한(비용 폭주 차단의 1순위 레버).
  maxWebSearchUses: 4,
  // 호출당 누적 입력 토큰 상한 — pause_turn 재개 루프가 이 값을 넘으면 즉시 중단.
  // (web_search 결과 재전송으로 입력 토큰이 곱셈 증가하는 폭주를 호출 내부에서 차단)
  // 실측 피크 ~33k 기준 1.5x. 호출 worst-case 를 $0.27→$0.18 로 낮춘다.
  maxInputTokensPerCall: 50_000,
  // 서버 도구 재개(pause_turn) 최대 횟수.
  maxContinuations: 2,
  // L2 per-session(이번 run)
  sessionBudgetUsd: 0.5,
  maxTargetsPerRun: 6,
  // L3 per-day
  dailyQuotaUsd: 3.0,
  // L4 anomaly circuit breaker
  maxFailureRate: 0.5, // run 내 실패율이 이 값을 넘으면 중단+escalate
  // 품질 게이트(LLM-as-judge). 핵심(대회명·날짜·지역)만 있으면 통과시키는 정책이라
  // 선택 필드(주최 연락처·우회 등) 누락으로 반려하지 않도록 임계를 낮춘다(judge 변동성 여유 포함).
  qualityThreshold: 6.0,
  // 수집 즉시 자동 게시(true) — 사람 검수(staging) 생략. 품질 게이트는 그대로 유지.
  // false 면 staging 까지만 적재하고 /admin 에서 수동 게시(ADR-007 원안).
  autoPublish: true,

  // worker 는 web_search(서버 도구)를 쓰므로 이를 지원하는 Sonnet 사용.
  // judge 는 검색 불필요 + 소형 작업 → Haiku(1/3 가격)로 비용 절감.
  workerModel: 'claude-sonnet-4-6',
  judgeModel: 'claude-haiku-4-5',
} as const;

/** 서버사이드 웹 검색 도구(실제 정보 수집용). max_uses 로 호출당 검색 횟수 상한. */
export const WEB_SEARCH_TOOL = {
  type: 'web_search_20260209',
  name: 'web_search',
  max_uses: AGENT_CONFIG.maxWebSearchUses,
} as const;

/** 모델별 100만 토큰당 단가(USD). 비용 추정용(대략치). */
export const MODEL_PRICING: Record<string, { input: number; output: number }> =
  {
    'claude-haiku-4-5': { input: 1.0, output: 5.0 },
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
