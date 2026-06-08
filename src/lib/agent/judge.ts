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
  '당신은 "여기·이 시간에 도로통제 마라톤이 있다"를 시민에게 알리는 데이터의 품질을 평가합니다. ' +
  '이 서비스의 목적은 마라톤으로 불편을 겪는 시민이 "어떤 대회가 언제 어디서" 열리는지 알고 ' +
  '자신의 손실 시간을 기록하게 하는 것입니다. 그러므로:\n' +
  '- 핵심(필수): name(대회명)·event_date(날짜)·area(지역) 이 있고 신뢰할 출처로 뒷받침되면 높은 점수.\n' +
  '- 선택(있으면 가점, **없어도 감점 금지**): start_time/end_time·control_zone·주최 연락처/이메일/URL·' +
  'detour_info(우회)·코스/거리/참가비 등. 이런 값이 null 이거나 비어 있어도 "정보 없음"일 뿐 품질 결함이 아닙니다.\n' +
  '- 감점은 오직: 핵심(name/date/area) 누락, 출처 불명·불일치, 명백히 틀린 정보일 때만.\n' +
  '핵심 3개가 신뢰 출처와 함께 있으면 **최소 8점** 이상 주세요(선택 필드가 다 비어 있어도). ' +
  '출력은 정확히 `{"score": 0~10 숫자, "issues": ["짧은 문제 1", ...]}` JSON 객체 하나만. ' +
  'issues 는 최대 5개, 각 항목은 짧은 한 구절로. 그 외 필드·설명·머리말 절대 금지.';

/** mock 결정론 채점 — 핵심(name/date/area) 위주. 선택 필드 누락은 issues 에만 남기고 감점 안 함. */
function mockScore(c: NormalizedMarathon): JudgeResult {
  const issues: string[] = [];
  // 핵심 3개는 스키마상 필수라 통상 존재 → 기본 고점. area 불명확만 실질 감점.
  let score = 9;
  if (!c.area || c.area === '미상') {
    score -= 3;
    issues.push('영향 지역 불명확');
  }
  // 선택 필드 누락은 "정보 없음"으로 기록만(감점 없음).
  if (!c.organizer_name) {
    issues.push('주최측 이름 없음(선택)');
  }
  if (!c.organizer_email && !c.organizer_contact) {
    issues.push('주최측 연락처 없음(선택)');
  }
  if (c.detour_info.subway.length + c.detour_info.bus.length === 0) {
    issues.push('우회 안내 없음(선택)');
  }
  return { score: Math.max(0, Math.min(10, score)), issues };
}

export async function judgeQuality(
  candidate: NormalizedMarathon,
): Promise<{ data: JudgeResult; usage: Usage }> {
  return callStructured({
    model: AGENT_CONFIG.judgeModel,
    system: JUDGE_SYSTEM,
    prompt: `다음 정형 데이터를 평가하세요:\n${JSON.stringify(candidate)}`,
    schema: JudgeResultSchema,
    // 512 는 verbose 채점 출력에 부족해 잘림(괄호 불균형 실패) → 여유 상향.
    maxTokens: 1024,
    mock: () => mockScore(candidate),
  });
}
