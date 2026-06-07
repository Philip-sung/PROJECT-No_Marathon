import { withMock, MOCK_MARATHONS } from '@/lib/mock';
import { createServerSupabase } from '@/lib/supabase/server';
import { MarathonSchema, type Marathon } from '@/lib/db/schema';

/**
 * 공개(published) 마라톤 목록. mock 모드면 fixture, live 면 공개 뷰 조회.
 * CLAUDE.md [P1]: 응답은 Zod 로 파싱(타입 단언 없음).
 */
export async function getPublishedMarathons(): Promise<Marathon[]> {
  return withMock<Marathon[]>([...MOCK_MARATHONS], async () => {
    const supabase = await createServerSupabase();
    if (!supabase) {
      return [...MOCK_MARATHONS];
    }
    const { data, error } = await supabase
      .from('v_marathons_public')
      .select('*')
      .order('event_date', { ascending: false });
    if (error) {
      throw new Error(`마라톤 목록 조회 실패: ${error.message}`);
    }
    return MarathonSchema.array().parse(data);
  });
}
