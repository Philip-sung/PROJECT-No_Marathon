import 'server-only';
import { callStructured } from '@/lib/agent/claude';
import { AGENT_CONFIG, WEB_SEARCH_TOOL } from '@/lib/agent/config';
import {
  NormalizedMarathonSchema,
  type NormalizedMarathon,
  type Usage,
} from '@/lib/agent/types';
import type { ResearchTarget } from '@/lib/agent/targets';
import { MOCK_RESEARCH, MOCK_RESEARCH_FALLBACK } from '@/lib/mock/datasets';

/**
 * Worker — web_search 로 실제 웹을 검색해 마라톤 정보를 정형화(live).
 * mock 에서는 외부호출 없이 datasets(SSOT)의 canned 결과를 반환.
 * subagent = intelligent filter(PDF §7.2.3): 원문이 아닌 정형 결과만 반환.
 */
const WORKER_SYSTEM =
  '당신은 한국(특히 서울) 마라톤 교통통제 정보를 수집·정형화하는 보조자입니다. ' +
  'web_search 도구로 실제 최신 정보를 검색해 확인한 뒤, 마라톤명, 날짜(YYYY-MM-DD), ' +
  '통제 시간(start_time/end_time, ISO8601), 영향 지역, 통제구간(control_zone: center{lat,lng}/radius_m), ' +
  '주최측 정보(이름/홈페이지/연락처/이메일), 우회 안내(detour_info: 지하철/버스 목록)를 채우세요. ' +
  '검색으로 확인되지 않은 값은 추측하지 말고 null 로 두세요(거짓 정보 금지).';

export async function researchMarathon(
  target: ResearchTarget,
): Promise<{ data: NormalizedMarathon; usage: Usage }> {
  return callStructured({
    model: AGENT_CONFIG.workerModel,
    system: WORKER_SYSTEM,
    prompt: `다음 주제로 실제 마라톤 정보를 검색·정형화하세요: "${target.query}". 신뢰할 수 있는 출처(주최측/관할기관/뉴스)를 우선하세요.`,
    schema: NormalizedMarathonSchema,
    maxTokens: AGENT_CONFIG.maxTokens,
    tools: [WEB_SEARCH_TOOL],
    mock: () => MOCK_RESEARCH[target.key] ?? MOCK_RESEARCH_FALLBACK,
  });
}
