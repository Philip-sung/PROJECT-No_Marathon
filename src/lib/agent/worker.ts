import 'server-only';
import { callStructured } from '@/lib/agent/claude';
import { AGENT_CONFIG } from '@/lib/agent/config';
import {
  NormalizedMarathonSchema,
  type NormalizedMarathon,
  type Usage,
} from '@/lib/agent/types';
import type { ResearchTarget } from '@/lib/agent/targets';

/**
 * Worker(저비용 모델) — 한 타깃을 조사해 정형화된 마라톤 정보로 산출.
 * subagent = intelligent filter(PDF §7.2.3): 원문이 아닌 정형 결과만 반환.
 */
const WORKER_SYSTEM =
  '당신은 한국 마라톤 교통통제 정보를 수집·정형화하는 보조자입니다. ' +
  '주어진 주제로 마라톤명, 날짜(YYYY-MM-DD), 영향 지역, 주최측 정보(이름/홈페이지/연락처/이메일), ' +
  '우회 안내(지하철/버스 목록)를 가능한 범위에서 채워 JSON 으로 정형화하세요. 불확실한 값은 null.';

/** mock 결정론 데이터 — 타깃 key 별 canned 결과. */
function mockResult(target: ResearchTarget): NormalizedMarathon {
  if (target.key === 'seoul-spring') {
    return {
      name: '서울 도심 봄 마라톤',
      event_date: '2026-04-26',
      area: '광화문·종로 일대',
      lat: 37.5759,
      lng: 126.9769,
      organizer_name: '서울러닝협회',
      organizer_url: 'https://example.org/seoul-spring',
      organizer_contact: '02-123-4567',
      organizer_email: 'info@example.org',
      detour_info: {
        subway: ['1호선 종각역 이용', '5호선 광화문역 일부 출구 통제'],
        bus: ['간선 150번 임시 우회'],
      },
      source: 'mock://seoul-spring',
    };
  }
  if (target.key === 'hangang-autumn') {
    return {
      name: '한강 가을 마라톤',
      event_date: '2026-10-18',
      area: '여의도·마포대교 일대',
      lat: 37.5285,
      lng: 126.9325,
      organizer_name: '한강마라톤조직위',
      organizer_url: 'https://example.org/hangang',
      organizer_contact: null,
      organizer_email: 'hangang@example.org',
      detour_info: { subway: ['5호선 여의나루역 이용'], bus: [] },
      source: 'mock://hangang-autumn',
    };
  }
  // 불완전 샘플 — 스키마는 통과하나 품질(judge) 낮아 반려되는 경로 검증용.
  return {
    name: '정보 불완전 마라톤',
    event_date: '2026-12-01',
    area: '미상',
    detour_info: { subway: [], bus: [] },
    source: 'mock://incomplete',
  };
}

export async function researchMarathon(
  target: ResearchTarget,
): Promise<{ data: NormalizedMarathon; usage: Usage }> {
  return callStructured({
    model: AGENT_CONFIG.workerModel,
    system: WORKER_SYSTEM,
    prompt: `다음 주제의 마라톤 정보를 정형화하세요: "${target.query}"`,
    schema: NormalizedMarathonSchema,
    maxTokens: AGENT_CONFIG.maxTokens,
    mock: () => mockResult(target),
  });
}
