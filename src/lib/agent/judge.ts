import 'server-only';
import { callStructured } from '@/lib/agent/claude';
import { AGENT_CONFIG } from '@/lib/agent/config';
import {
  JudgeResultSchema,
  type JudgeResult,
  type NormalizedMarathon,
  type Usage,
} from '@/lib/agent/types';

/**
 * LLM-as-judge(PDF §14.3) — 정형화 결과의 품질을 0~10 채점.
 * 임계 미달은 staging 등록하지 않고 반려(silent failure 방지).
 */
const JUDGE_SYSTEM =
  '당신은 수집된 마라톤 정보의 품질을 평가하는 심사자입니다. ' +
  '완전성(날짜/지역/주최/연락/우회), 구체성, 신뢰성을 기준으로 0~10 점과 문제점 목록을 JSON 으로 출력하세요.';

/** mock 결정론 채점 — 완전성 기반 휴리스틱. */
function mockScore(c: NormalizedMarathon): JudgeResult {
  const issues: string[] = [];
  let score = 4;
  if (c.organizer_name) {
    score += 2;
  } else {
    issues.push('주최측 이름 누락');
  }
  if (c.organizer_email || c.organizer_contact) {
    score += 1;
  } else {
    issues.push('주최측 연락처 누락');
  }
  if (c.detour_info.subway.length + c.detour_info.bus.length > 0) {
    score += 2;
  } else {
    issues.push('우회 안내 없음');
  }
  if (c.area && c.area !== '미상') {
    score += 1;
  } else {
    issues.push('영향 지역 불명확');
  }
  return { score: Math.min(10, score), issues };
}

export async function judgeQuality(
  candidate: NormalizedMarathon,
): Promise<{ data: JudgeResult; usage: Usage }> {
  return callStructured({
    model: AGENT_CONFIG.judgeModel,
    system: JUDGE_SYSTEM,
    prompt: `다음 정형 데이터를 평가하세요:\n${JSON.stringify(candidate)}`,
    schema: JudgeResultSchema,
    maxTokens: 512,
    mock: () => mockScore(candidate),
  });
}
