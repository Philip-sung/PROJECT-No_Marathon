import { isMock } from '@/lib/env';

/**
 * Mock 레이어 — dev 에서 외부 의존(Supabase/Claude) 없이 동작하기 위한 단일 진입점.
 * prompt.md §05: dev 는 모킹 적극 활용, prod 는 secret 주입.
 */

export { isMock };
export * from '@/lib/mock/fixtures';

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
