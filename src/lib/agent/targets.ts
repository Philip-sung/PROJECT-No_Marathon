import 'server-only';

/**
 * Lead(오케스트레이터)의 조사 대상 선정.
 * 현재는 결정론적 시드 쿼리(LLM 비용 절약). live 에서는 추후 검색 기반
 * 동적 발견으로 확장 가능(Phase 8+). 각 타깃은 worker 가 독립 처리.
 */
export interface ResearchTarget {
  key: string;
  query: string;
}

export function getResearchTargets(): ResearchTarget[] {
  return [
    {
      key: 'seoul-upcoming',
      query: '다가오는 서울 도심 마라톤 일정과 도로 교통통제 구간·시간',
    },
    {
      key: 'hangang-upcoming',
      query: '여의도·한강 일대 마라톤 일정과 교통통제 우회 안내',
    },
    {
      key: 'seoul-jamsil',
      query: '잠실·강남 권역 마라톤 대회 일정 및 교통 통제 정보',
    },
  ];
}
