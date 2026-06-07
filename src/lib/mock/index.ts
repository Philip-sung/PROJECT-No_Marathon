import { isMock } from '@/lib/env';

/**
 * Mock 레이어 — dev 에서 외부 의존(Supabase/Claude) 없이 동작하기 위한 단일 진입점.
 * prompt.md §05: dev 는 모킹 적극 활용, prod 는 secret 주입.
 *
 * Phase 2 이후 각 도메인(마라톤/집계/댓글/수집)별 mock fixture 를 여기에 추가한다.
 */

export { isMock };

/** mock 모드일 때 mockValue, 아니면 live 호출 결과를 반환하는 헬퍼. */
export async function withMock<T>(
  mockValue: T,
  live: () => Promise<T>,
): Promise<T> {
  if (isMock) {
    return mockValue;
  }
  return live();
}

/** Phase 1 동작 확인용 샘플 픽스처(마라톤). Phase 2에서 실제 스키마로 대체. */
export interface MarathonFixture {
  id: string;
  name: string;
  date: string;
  area: string;
}

export const SAMPLE_MARATHONS: readonly MarathonFixture[] = [
  {
    id: 'sample-1',
    name: '서울 ○○ 마라톤 (샘플)',
    date: '2026-04-19',
    area: '광화문·종로 일대',
  },
];
