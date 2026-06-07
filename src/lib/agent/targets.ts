import 'server-only';

/**
 * Lead(오케스트레이터)의 조사 대상 선정.
 * 현재는 결정론적 시드 쿼리(LLM 비용 절약). live 에서는 추후 검색 기반
 * 동적 발견으로 확장 가능(Phase 8+). 각 타깃은 worker 가 독립 처리.
 *
 * 첫 타깃(seoul-monthly-registry)은 완전성 앵커다 — 서울시 월별
 * 「광역 교통통제 마라톤 안내」를 전수 스캔해 그 달 통제 대회를 모두 열거한다.
 * 나머지 권역 타깃은 그 결과를 권역별로 보강·교차검증한다. 권위 출처 목록은
 * sources.ts(AUTHORITATIVE_SOURCES)에 있고 worker 시스템 프롬프트에 주입된다.
 */
export interface ResearchTarget {
  key: string;
  query: string;
}

export function getResearchTargets(): ResearchTarget[] {
  return [
    {
      key: 'seoul-monthly-registry',
      query:
        '서울시 월별 「광역 교통통제(예정) 마라톤 안내」와 서울경찰청 교통정보센터(SPATIC) 공지를 근거로 이번 달·다음 달 서울에서 도로 교통통제를 수반하는 마라톤 대회를 모두 열거하고 각 대회를 정형화',
    },
    {
      key: 'seoul-aggregator-sweep',
      query:
        '마라톤GO·KorMarathon 등 종합 일정에서 오늘 이후 다가오는 서울 지역 마라톤을 자선·테마·기업후원(예: 마인드마라톤 등 서울광장·도심 행사) 포함 전수 열거하고, 각 대회가 도로 교통통제를 수반하는지 확인해 정형화',
    },
    {
      key: 'seoul-upcoming',
      query:
        '다가오는 서울 도심(광화문·서울광장·종로·잠실 등) 마라톤(자선·테마 포함) 일정과 도로 교통통제 구간·시간',
    },
    {
      key: 'hangang-upcoming',
      query: '여의도·한강 일대 마라톤 일정과 교통통제 우회 안내',
    },
  ];
}
