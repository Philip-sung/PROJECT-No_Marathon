import 'server-only';
import { callStructured } from '@/lib/agent/claude';
import { AGENT_CONFIG, WEB_SEARCH_TOOL } from '@/lib/agent/config';
import {
  NormalizedMarathonListSchema,
  type NormalizedMarathon,
  type Usage,
} from '@/lib/agent/types';
import type { ResearchTarget } from '@/lib/agent/targets';
import { sourcesPromptBlock } from '@/lib/agent/sources';
import { MOCK_RESEARCH, MOCK_RESEARCH_FALLBACK } from '@/lib/mock/datasets';

/**
 * Worker — web_search 로 실제 웹을 검색해 마라톤 정보를 정형화(live).
 * mock 에서는 외부호출 없이 datasets(SSOT)의 canned 결과를 반환.
 * subagent = intelligent filter(PDF §7.2.3): 원문이 아닌 정형 결과만 반환.
 *
 * 출처 정책: 권위 1차 출처(sources.ts)를 **반드시 먼저** 조회하고, 후보를
 * 서울시 월별 안내에 **대조**해 완전성(누락)을 점검한 뒤, 그 위에 web_search 로
 * **추가 검색·교차검증**을 보강한다(앵커 조회로 끝내지 말 것).
 */
const WORKER_SYSTEM = [
  '당신은 한국(특히 서울) 마라톤 교통통제 정보를 수집·정형화하는 보조자입니다.',
  '',
  '아래 권위 출처를 web_search 로 먼저 조회하세요. 검색은 꼭 필요한 만큼만 — **최대 4회**로 제한됩니다.',
  '핵심 출처 1~2개로 충분한 정보를 얻으면 더 검색하지 말고 바로 정형화하세요. 명백한 누락이',
  '의심될 때만 1회 더 교차검증하세요. 같은 내용을 반복 검색하지 마세요.',
  '',
  '[앵커 중복 조회 금지] 사용자 메시지에 「이미 발견된 후보」 목록이 주어지면, 서울시 월별 안내·',
  'SPATIC·TOPIS 같은 1차 출처(앵커)는 **다시 조회하지 마세요** — 앞 단계가 이미 수집했습니다.',
  '그 경우 web_search 는 오직 **당신의 담당 출처**(이 타깃 쿼리)로 그 목록을 교차검증하고,',
  '목록에 빠진 대회만 보강하는 데 쓰세요. 목록이 없으면 평소대로 앵커부터 전수 조회하세요.',
  '',
  sourcesPromptBlock(),
  '',
  '[완전성 점검] 수집한 대회가 해당 월 「서울시 광역 교통통제 마라톤 안내」 목록에 포함되는지',
  '대조하세요. 목록에 있는데 빠진 대회가 있으면 그것도 조사 대상에 포함하세요.',
  '',
  '[기간] 이미 종료된 과거 대회는 제외하고, 오늘(현재 날짜) 이후의 예정 대회만 포함하세요.',
  '',
  '[누락 금지 — 대회 유형 확대] 유명 대회명(서울마라톤·JTBC 등)만 보지 말고, 자선·테마·기업후원',
  '마라톤(예: 마인드마라톤, 지구런처럼 서울광장·여의도·상암·잠실 등 도심에서 다수 인원이 도로를',
  '점유하는 행사)도 포함하세요. 종합 일정(마라톤GO·KorMarathon)에서 그 달 서울 대회를 한 번에',
  '확인하되, 과도한 반복 검색은 피하고 도로 교통통제를 수반하는 대회만 추리세요.',
  '',
  '[정형화] 발견한 **모든** 대회 각각에 대해 다음 필드를 채우세요: 마라톤명, 날짜(YYYY-MM-DD),',
  '통제 시간(start_time/end_time, ISO8601), 영향 지역(area), 통제구간(control_zone: center{lat,lng}/radius_m),',
  '주최측(이름/홈페이지/연락처/이메일), 우회 안내(detour_info: 지하철/버스 목록).',
  '신뢰할 수 있는 출처(주최측/관할기관/뉴스)를 우선하세요.',
  '',
  '[거짓 정보 금지] 검색으로 확인되지 않은 값은 추측하지 말고 반드시 null 로 두세요.',
  '확인한 핵심 근거 URL 을 각 대회의 source 에 기록하세요.',
  '',
  '[출력 형식] 최상위는 **마라톤 객체들의 JSON 배열**(`[ { …대회1… }, { …대회2… } ]`) 하나만 출력하세요.',
  '대회가 1건이면 원소 1개짜리 배열, 해당 월에 도로통제 대회가 없으면 빈 배열 `[]` 을 출력하세요.',
  '배열 외의 설명·머리말·코드펜스는 절대 쓰지 마세요.',
].join('\n');

/**
 * @param known 앞선 타깃들이 이미 발견한 후보. 비어있지 않으면 worker 는 앵커(1차 출처)
 *   재조회를 생략하고 자기 담당 출처로 이 목록을 교차검증·보강한다(앵커 중복 검색 제거).
 */
export async function researchMarathon(
  target: ResearchTarget,
  known: NormalizedMarathon[] = [],
): Promise<{ data: NormalizedMarathon[]; usage: Usage }> {
  const knownBlock =
    known.length === 0
      ? ''
      : [
          '',
          '[이미 발견된 후보 — 앵커 재조회 금지, 이 목록을 교차검증·보강만 하세요]',
          ...known.map((m) => `- ${m.name} | ${m.event_date} | ${m.area}`),
        ].join('\n');

  return callStructured({
    model: AGENT_CONFIG.workerModel,
    system: WORKER_SYSTEM,
    prompt: `다음 주제로 실제 마라톤 정보를 검색·정형화하세요: "${target.query}". 신뢰할 수 있는 출처(주최측/관할기관/뉴스)를 우선하세요. 해당하는 대회를 모두 찾아 배열로 반환하세요.${knownBlock}`,
    schema: NormalizedMarathonListSchema,
    maxTokens: AGENT_CONFIG.maxTokens,
    tools: [WEB_SEARCH_TOOL],
    // mock 은 단일 canned 결과를 1원소 배열로 감싼다(datasets 변경 없이 리스트 계약 충족).
    mock: () => [MOCK_RESEARCH[target.key] ?? MOCK_RESEARCH_FALLBACK],
  });
}
