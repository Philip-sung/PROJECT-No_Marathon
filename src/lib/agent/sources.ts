import 'server-only';

/**
 * ── 마라톤 교통통제 정보의 권위 있는 참조 출처(SSOT) ──
 * worker(수집 에이전트)가 매 수집 시 **반드시 먼저 조회**하고, 수집 후보를
 * 여기(특히 서울시 월별 안내)에 **대조**하여 완전성(누락 여부)을 검증한다.
 * 그 위에 web_search 로 **추가 검색·교차검증**을 보강한다(앵커 ≠ 검색 생략).
 *
 * 완전성 검증의 논리:
 *   "이번 달 광역 교통통제 마라톤" = 서울시 월별 안내가 전수 나열하는 목록.
 *   따라서 후보를 그 목록에 대조하면 누락을 발견할 수 있다(=레지스트리 대조).
 *   통제를 수반하지 않는 소규모 대회는 본 사이트 범위 밖이라 제외해도 무방.
 *
 * tier:
 *   'primary'    — 정부/통제 집행 주체. 완전성 앵커.
 *   'aggregator' — 종합 일정. 후보를 넓게 확보(recall)하는 용도.
 */
export interface AuthoritativeSource {
  name: string;
  url: string;
  tier: 'primary' | 'aggregator';
  role: string;
}

export const AUTHORITATIVE_SOURCES: AuthoritativeSource[] = [
  {
    name: '서울시 월별 「광역 교통통제(예정) 마라톤 안내」',
    url: 'https://news.seoul.go.kr/culture',
    tier: 'primary',
    role: '그 달 2개구 이상 통제 마라톤을 전수 나열하는 목록. 완전성 검증의 황금 기준(이미지 공지일 수 있으니 본문/첨부를 끝까지 읽어 확인). 월별 갱신.',
  },
  {
    name: '서울경찰청 교통정보센터(SPATIC)',
    url: 'https://www.spatic.go.kr',
    tier: 'primary',
    role: '도로를 실제로 통제하는 집행 주체 = 최종 권위. 시간대별·구간별 통제표의 원천. [행사/전면통제] 공지.',
  },
  {
    name: '서울 교통정보 시스템(TOPIS)',
    url: 'https://topis.seoul.go.kr',
    tier: 'primary',
    role: '교통통제 지도, 집회/행사 교통관리 목록, 공지사항. 공공데이터 API(실시간) 제공.',
  },
  {
    name: '마라톤GO 국내 대회 일정',
    url: 'https://marathongo.co.kr/raceSchedule/domestic',
    tier: 'aggregator',
    role: '국내 대회 일정 종합. 자선·테마·기업후원 대회까지 전수 열거 — recall 의 핵심.',
  },
  {
    name: 'KorMarathon 대회 DB',
    url: 'https://www.kormarathon.com/',
    tier: 'aggregator',
    role: '대회 메타데이터 종합 DB. 유명 대회 외 소규모·테마 대회 누락 보완(교차검증).',
  },
  {
    name: '국내 마라톤 대회일정(marathon.pe.kr)',
    url: 'http://www.marathon.pe.kr/schedule_index.html',
    tier: 'aggregator',
    role: '오래된 종합 일정표. 교차검증용.',
  },
];

/** worker 시스템 프롬프트에 주입할 출처 안내 블록. */
export function sourcesPromptBlock(): string {
  const fmt = (s: AuthoritativeSource): string =>
    `- ${s.name} (${s.url}) — ${s.role}`;
  const primary = AUTHORITATIVE_SOURCES.filter((s) => s.tier === 'primary');
  const aggregator = AUTHORITATIVE_SOURCES.filter(
    (s) => s.tier === 'aggregator',
  );
  return [
    '[반드시 먼저 조회할 1차 출처 — 완전성 앵커]',
    ...primary.map(fmt),
    '',
    '[후보를 넓게 수집할 종합 일정 — 보강]',
    ...aggregator.map(fmt),
  ].join('\n');
}
