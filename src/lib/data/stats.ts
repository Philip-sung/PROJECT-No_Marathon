import 'server-only';
import { isMock } from '@/lib/env';
import { createServerSupabase } from '@/lib/supabase/server';
import { MarathonStatsSchema, type MarathonStats } from '@/lib/db/schema';
import * as store from '@/lib/mock/store';

/**
 * 전체 published 마라톤 집계(취지 페이지 헤드라인용).
 * mock 모드면 인메모리 스토어에서 계산(입력이 즉시 반영), live 면 v_marathon_stats.
 */
export async function getAllMarathonStats(): Promise<MarathonStats[]> {
  if (isMock) {
    return store.computeAllStats();
  }
  const supabase = await createServerSupabase();
  if (!supabase) {
    return [];
  }
  const { data, error } = await supabase.from('v_marathon_stats').select('*');
  if (error) {
    throw new Error(`집계 조회 실패: ${error.message}`);
  }
  return MarathonStatsSchema.array().parse(data);
}

export async function getMarathonStats(
  marathonId: string,
): Promise<MarathonStats | null> {
  const all = await getAllMarathonStats();
  return all.find((s) => s.marathon_id === marathonId) ?? null;
}
