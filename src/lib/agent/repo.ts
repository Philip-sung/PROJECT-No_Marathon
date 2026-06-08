import 'server-only';
import { z } from 'zod';
import { isMock } from '@/lib/env';
import { createAdminSupabase } from '@/lib/supabase/admin';
import * as store from '@/lib/mock/store';
import type { NormalizedMarathon } from '@/lib/agent/types';
import {
  AdminMarathonSchema,
  type AdminMarathon,
  type AdminMarathonPatch,
} from '@/lib/db/schema';

/**
 * 수집 에이전트 영속 계층(L2). mock→인메모리 스토어, live→service_role.
 */

export interface StagingMarathon {
  id: string;
  name: string;
  event_date: string;
  area: string;
  source: string | null;
  content_hash: string | null;
  created_at: string;
}

const StagingSchema: z.ZodType<StagingMarathon> = z.object({
  id: z.string(),
  name: z.string(),
  event_date: z.string(),
  area: z.string(),
  source: z.string().nullable(),
  content_hash: z.string().nullable(),
  created_at: z.string(),
});

export async function existingContentHashes(): Promise<Set<string>> {
  if (isMock) {
    return store.getAllContentHashes();
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return new Set();
  }
  const { data, error } = await supabase
    .from('marathons')
    .select('content_hash')
    .not('content_hash', 'is', null);
  if (error) {
    throw new Error(`해시 조회 실패: ${error.message}`);
  }
  const rows = z
    .array(z.object({ content_hash: z.string().nullable() }))
    .parse(data);
  return new Set(rows.flatMap((r) => (r.content_hash ? [r.content_hash] : [])));
}

/**
 * 기존 마라톤의 (이름·날짜) 키 — fuzzy 중복 판정용(name+date 유사도).
 * content_hash(정확 일치)는 LLM 출력 변동에 뚫려 매일 중복이 쌓이므로, 이 키로 교체한다.
 */
export async function existingMarathonKeys(): Promise<
  { name: string; event_date: string }[]
> {
  if (isMock) {
    return store.getAllMarathonKeys();
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return [];
  }
  const { data, error } = await supabase
    .from('marathons')
    .select('name, event_date');
  if (error) {
    throw new Error(`마라톤 키 조회 실패: ${error.message}`);
  }
  return z
    .array(z.object({ name: z.string(), event_date: z.string() }))
    .parse(data);
}

export async function todayCostUsd(todayPrefix: string): Promise<number> {
  if (isMock) {
    return store.getTodayCostUsd(todayPrefix);
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    // 관리자 Supabase 미구성 = 일일 비용 원장을 읽을 수단이 없음. 0 을 돌려주면
    // L3 일일 비용 천장이 조용히 무력화되어(폭주 사고의 구조) 비용이 무한 누적될 수
    // 있으므로, "읽을 수 없음"을 명시적으로 알려 호출자가 fail-safe 로 중단하게 한다.
    throw new Error(
      '관리자 Supabase 미구성 — 일일 비용 원장을 읽을 수 없습니다.',
    );
  }
  const { data, error } = await supabase
    .from('ai_collection_log')
    .select('cost_usd')
    .gte('created_at', `${todayPrefix}T00:00:00Z`);
  if (error) {
    throw new Error(`일일 비용 조회 실패: ${error.message}`);
  }
  const rows = z
    .array(z.object({ cost_usd: z.number().nullable() }))
    .parse(data);
  return rows.reduce((s, r) => s + (r.cost_usd ?? 0), 0);
}

export async function stageMarathon(
  n: NormalizedMarathon,
  contentHash: string,
  nowIso: string,
): Promise<string> {
  if (isMock) {
    return store.addStagingMarathon(n, contentHash, nowIso);
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    throw new Error('admin 클라이언트가 없습니다.');
  }
  const { data, error } = await supabase
    .from('marathons')
    .insert({
      name: n.name,
      event_date: n.event_date,
      start_time: n.start_time ?? null,
      end_time: n.end_time ?? null,
      area: n.area,
      lat: n.lat ?? null,
      lng: n.lng ?? null,
      organizer_name: n.organizer_name ?? null,
      organizer_url: n.organizer_url ?? null,
      organizer_contact: n.organizer_contact ?? null,
      organizer_email: n.organizer_email ?? null,
      detour_info: n.detour_info,
      control_zone: n.control_zone ?? {},
      source: n.source ?? 'ai',
      content_hash: contentHash,
      status: 'staging',
    })
    .select('id')
    .single();
  if (error) {
    throw new Error(`staging 등록 실패: ${error.message}`);
  }
  return z.object({ id: z.string() }).parse(data).id;
}

export async function logCollection(entry: {
  run_id: string;
  target: string;
  content_hash: string | null;
  status: 'success' | 'failure' | 'skipped' | 'pending_review';
  quality_score: number | null;
  model: string | null;
  cost_usd: number | null;
  nowIso: string;
}): Promise<void> {
  if (isMock) {
    store.addCollectionLog(entry);
    return;
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return;
  }
  const { error } = await supabase.from('ai_collection_log').insert({
    run_id: entry.run_id,
    target: entry.target,
    content_hash: entry.content_hash,
    status: entry.status,
    quality_score: entry.quality_score,
    model: entry.model,
    cost_usd: entry.cost_usd,
  });
  if (error) {
    throw new Error(`ledger 기록 실패: ${error.message}`);
  }
}

export async function listStaging(): Promise<StagingMarathon[]> {
  if (isMock) {
    return store.listStagingMarathons();
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return [];
  }
  const { data, error } = await supabase
    .from('marathons')
    .select('id, name, event_date, area, source, content_hash, created_at')
    .eq('status', 'staging');
  if (error) {
    throw new Error(`staging 목록 조회 실패: ${error.message}`);
  }
  return StagingSchema.array().parse(data);
}

export interface CollectionMetrics {
  total_logged: number;
  staged: number;
  pending_review: number;
  today_cost_usd: number;
  event_count: number;
}

export async function collectionMetrics(
  todayPrefix: string,
): Promise<CollectionMetrics> {
  if (isMock) {
    const m = store.getCollectionMetrics(todayPrefix);
    return {
      total_logged: m.total_logged,
      staged: m.staged,
      pending_review: m.pending_review,
      today_cost_usd: Number(m.today_cost_usd.toFixed(6)),
      event_count: m.event_count,
    };
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return {
      total_logged: 0,
      staged: 0,
      pending_review: 0,
      today_cost_usd: 0,
      event_count: 0,
    };
  }
  const [logCount, staging, todayCost, eventCount] = await Promise.all([
    supabase
      .from('ai_collection_log')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('marathons')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'staging'),
    todayCostUsd(todayPrefix),
    supabase.from('events').select('*', { count: 'exact', head: true }),
  ]);
  return {
    total_logged: logCount.count ?? 0,
    staged: staging.count ?? 0,
    pending_review: staging.count ?? 0,
    today_cost_usd: Number(todayCost.toFixed(6)),
    event_count: eventCount.count ?? 0,
  };
}

// ── 관리자(백오피스) ──────────────────────────────────────
export async function listAllMarathons(): Promise<AdminMarathon[]> {
  if (isMock) {
    return store.listAllMarathons();
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return [];
  }
  const { data, error } = await supabase
    .from('marathons')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(`마라톤 전체 조회 실패: ${error.message}`);
  }
  return AdminMarathonSchema.array().parse(data);
}

export async function updateMarathon(
  id: string,
  patch: AdminMarathonPatch,
): Promise<boolean> {
  if (isMock) {
    return store.updateMarathon(id, patch);
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return false;
  }
  const { data, error } = await supabase
    .from('marathons')
    .update(patch)
    .eq('id', id)
    .select('id');
  if (error) {
    throw new Error(`마라톤 수정 실패: ${error.message}`);
  }
  return Array.isArray(data) && data.length > 0;
}

export async function reviewMarathon(
  id: string,
  action: 'publish' | 'reject',
): Promise<boolean> {
  if (isMock) {
    return action === 'publish'
      ? store.promoteMarathon(id)
      : store.rejectMarathon(id);
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return false;
  }
  const status = action === 'publish' ? 'published' : 'archived';
  const { data, error } = await supabase
    .from('marathons')
    .update({ status })
    .eq('id', id)
    .eq('status', 'staging')
    .select('id');
  if (error) {
    throw new Error(`검수 처리 실패: ${error.message}`);
  }
  return Array.isArray(data) && data.length > 0;
}

/**
 * 마라톤 하드 삭제(행 제거). FK on delete cascade 로 해당 대회의 disruptions/comments/
 * comment_likes 도 함께 삭제된다(events 는 set null). 되돌릴 수 없으므로 관리자 전용.
 */
export async function deleteMarathon(id: string): Promise<boolean> {
  if (isMock) {
    return store.deleteMarathon(id);
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return false;
  }
  const { data, error } = await supabase
    .from('marathons')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) {
    throw new Error(`마라톤 삭제 실패: ${error.message}`);
  }
  return Array.isArray(data) && data.length > 0;
}

export interface MarathonEngagement {
  disruptions: number;
  minutes: number;
  comments: number;
}

/** 마라톤별 참여 집계(댓글 수·불편 입력 건수·누적 분) — 삭제 전 영향 확인용. */
export async function marathonEngagement(): Promise<
  Record<string, MarathonEngagement>
> {
  if (isMock) {
    return store.getMarathonEngagement();
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return {};
  }
  const [dRes, cRes] = await Promise.all([
    supabase.from('disruptions').select('marathon_id, minutes_lost'),
    supabase.from('comments').select('marathon_id'),
  ]);
  if (dRes.error) {
    throw new Error(`불편 집계 실패: ${dRes.error.message}`);
  }
  if (cRes.error) {
    throw new Error(`댓글 집계 실패: ${cRes.error.message}`);
  }
  const dRows = z
    .array(z.object({ marathon_id: z.string(), minutes_lost: z.number() }))
    .parse(dRes.data);
  const cRows = z.array(z.object({ marathon_id: z.string() })).parse(cRes.data);
  const out: Record<string, MarathonEngagement> = {};
  const ensure = (id: string): MarathonEngagement => {
    const cur = out[id];
    if (cur) {
      return cur;
    }
    const fresh: MarathonEngagement = {
      disruptions: 0,
      minutes: 0,
      comments: 0,
    };
    out[id] = fresh;
    return fresh;
  };
  for (const d of dRows) {
    const e = ensure(d.marathon_id);
    e.disruptions += 1;
    e.minutes += d.minutes_lost;
  }
  for (const c of cRows) {
    ensure(c.marathon_id).comments += 1;
  }
  return out;
}
