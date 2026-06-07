import 'server-only';
import { isMock } from '@/lib/env';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  MarathonStatsSchema,
  DisruptionPublicSchema,
  CommentPublicSchema,
} from '@/lib/db/schema';
import { type Summary } from '@/lib/api/types';
import * as store from '@/lib/mock/store';

const DISRUPTION_LIST_LIMIT = 100;

export async function getMarathonSummary(marathonId: string): Promise<Summary> {
  if (isMock) {
    return {
      stats: store.computeStats(marathonId),
      disruptions: store.listDisruptions(marathonId),
      comments: store.listComments(marathonId),
    };
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return { stats: null, disruptions: [], comments: [] };
  }

  const [statsRes, disrRes, cmtRes] = await Promise.all([
    supabase
      .from('v_marathon_stats')
      .select('*')
      .eq('marathon_id', marathonId)
      .maybeSingle(),
    supabase
      .from('v_disruptions_public')
      .select('*')
      .eq('marathon_id', marathonId)
      .order('created_at', { ascending: false })
      .limit(DISRUPTION_LIST_LIMIT),
    supabase
      .from('v_comments_public')
      .select('*')
      .eq('marathon_id', marathonId),
  ]);

  if (statsRes.error) {
    throw new Error(`집계 조회 실패: ${statsRes.error.message}`);
  }
  if (disrRes.error) {
    throw new Error(`불편 목록 조회 실패: ${disrRes.error.message}`);
  }
  if (cmtRes.error) {
    throw new Error(`댓글 조회 실패: ${cmtRes.error.message}`);
  }

  return {
    stats: statsRes.data ? MarathonStatsSchema.parse(statsRes.data) : null,
    disruptions: DisruptionPublicSchema.array().parse(disrRes.data),
    comments: CommentPublicSchema.array().parse(cmtRes.data),
  };
}
