import { withMock, MOCK_STATS } from '@/lib/mock';
import { createServerSupabase } from '@/lib/supabase/server';
import { MarathonStatsSchema, type MarathonStats } from '@/lib/db/schema';

/**
 * 전체 published 마라톤 집계(취지 페이지의 데이터+스토리 헤드라인용).
 * mock 모드면 fixture, live 면 v_marathon_stats 조회.
 */
export async function getAllMarathonStats(): Promise<MarathonStats[]> {
  return withMock<MarathonStats[]>([...MOCK_STATS], async () => {
    const supabase = await createServerSupabase();
    if (!supabase) {
      return [...MOCK_STATS];
    }
    const { data, error } = await supabase.from('v_marathon_stats').select('*');
    if (error) {
      throw new Error(`집계 조회 실패: ${error.message}`);
    }
    return MarathonStatsSchema.array().parse(data);
  });
}

/** 단일 마라톤 집계. */
export async function getMarathonStats(
  marathonId: string,
): Promise<MarathonStats | null> {
  const all = await getAllMarathonStats();
  return all.find((s) => s.marathon_id === marathonId) ?? null;
}
