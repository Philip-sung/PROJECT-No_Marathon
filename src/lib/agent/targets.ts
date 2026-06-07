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
    { key: 'seoul-spring', query: '서울 도심 봄 마라톤 교통통제 일정' },
    { key: 'hangang-autumn', query: '한강 가을 마라톤 교통통제 일정' },
    { key: 'incomplete-sample', query: '정보 불완전 샘플 마라톤' },
  ];
}
