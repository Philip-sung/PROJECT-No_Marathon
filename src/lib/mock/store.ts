import 'server-only';
import { randomUUID } from 'node:crypto';
import {
  MOCK_MARATHONS,
  MOCK_DISRUPTIONS,
  MOCK_COMMENTS,
} from '@/lib/mock/fixtures';
import type {
  DisruptionPublic,
  CommentPublic,
  MarathonStats,
  Marathon,
  EventInput,
} from '@/lib/db/schema';
import type { NormalizedMarathon } from '@/lib/agent/types';

/**
 * Mock 인메모리 스토어 — dev(mock 모드)에서 외부 DB 없이 입력/집계/댓글이
 * 실제로 동작하게 한다. 프로세스 메모리라 서버 재시작 시 fixture 로 초기화.
 * 쓰기는 모두 서버(Route Handler)에서만 호출(ADR-007).
 */

interface DisruptionRow extends DisruptionPublic {
  device_hash: string;
}
interface CommentRow extends CommentPublic {
  device_hash: string;
}
interface ReportRow {
  id: string;
  device_hash: string;
  body: string;
  contact: string | null;
  created_at: string;
}

const disruptions: DisruptionRow[] = MOCK_DISRUPTIONS.map((d, i) => ({
  ...d,
  device_hash: `seed-device-${i}`,
}));
const comments: CommentRow[] = MOCK_COMMENTS.map((c, i) => ({
  ...c,
  device_hash: `seed-comment-${i}`,
}));
const likes = new Set<string>(); // `${commentId}|${deviceHash}`
const reports: ReportRow[] = [];

// ── 마라톤(수집 에이전트 staging/publish, L2) ──────────────
interface MarathonRow {
  id: string;
  name: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  area: string;
  lat: number | null;
  lng: number | null;
  organizer_name: string | null;
  organizer_url: string | null;
  organizer_contact: string | null;
  organizer_email: string | null;
  detour_info: Record<string, unknown>;
  source: string | null;
  content_hash: string | null;
  status: 'staging' | 'published' | 'archived';
  created_at: string;
}

const marathons: MarathonRow[] = MOCK_MARATHONS.map((m, i) => ({
  id: m.id,
  name: m.name,
  event_date: m.event_date,
  start_time: m.start_time,
  end_time: m.end_time,
  area: m.area,
  lat: m.lat,
  lng: m.lng,
  organizer_name: m.organizer_name,
  organizer_url: m.organizer_url,
  organizer_contact: m.organizer_contact,
  organizer_email: m.organizer_email,
  detour_info: m.detour_info,
  source: 'seed',
  content_hash: `seed-${i}`,
  status: 'published',
  created_at: m.created_at,
}));

// ── 수집 ledger(L2) ───────────────────────────────────────
interface CollectionLogRow {
  id: string;
  run_id: string;
  target: string;
  content_hash: string | null;
  status: 'success' | 'failure' | 'skipped' | 'pending_review';
  quality_score: number | null;
  model: string | null;
  cost_usd: number | null;
  created_at: string;
}
const collectionLog: CollectionLogRow[] = [];

// ── events(분석/자산화 헤지) ──────────────────────────────
interface EventRow {
  id: number;
  event_type: string;
  marathon_id: string | null;
  created_at: string;
}
const events: EventRow[] = [];
let eventSeq = 0;

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-mock-${counter}`;
}

function toPublicDisruption(r: DisruptionRow): DisruptionPublic {
  return {
    id: r.id,
    marathon_id: r.marathon_id,
    minutes_lost: r.minutes_lost,
    note: r.note,
    display_name: r.display_name,
    created_at: r.created_at,
  };
}
function toPublicComment(r: CommentRow): CommentPublic {
  return {
    id: r.id,
    marathon_id: r.marathon_id,
    body: r.body,
    like_count: r.like_count,
    created_at: r.created_at,
  };
}

export function listDisruptions(marathonId: string): DisruptionPublic[] {
  return disruptions
    .filter((d) => d.marathon_id === marathonId)
    .sort((a, b) => b.minutes_lost - a.minutes_lost)
    .map(toPublicDisruption);
}

export function listComments(marathonId: string): CommentPublic[] {
  return comments
    .filter((c) => c.marathon_id === marathonId)
    .map(toPublicComment);
}

export function computeStats(marathonId: string): MarathonStats {
  const m = marathons.find((x) => x.id === marathonId);
  const rows = disruptions.filter((d) => d.marathon_id === marathonId);
  const total = rows.reduce((s, r) => s + r.minutes_lost, 0);
  const count = rows.length;
  return {
    marathon_id: marathonId,
    name: m?.name ?? '',
    event_date: m?.event_date ?? '',
    entry_count: count,
    total_minutes: total,
    avg_minutes: count === 0 ? 0 : Math.round(total / count),
  };
}

export function computeAllStats(): MarathonStats[] {
  return marathons
    .filter((m) => m.status === 'published')
    .map((m) => computeStats(m.id));
}

// ── 마라톤(수집/검수) ─────────────────────────────────────
function toPublicMarathon(r: MarathonRow): Marathon {
  return {
    id: r.id,
    name: r.name,
    event_date: r.event_date,
    start_time: r.start_time,
    end_time: r.end_time,
    area: r.area,
    lat: r.lat,
    lng: r.lng,
    organizer_name: r.organizer_name,
    organizer_url: r.organizer_url,
    organizer_contact: r.organizer_contact,
    organizer_email: r.organizer_email,
    detour_info: r.detour_info,
    created_at: r.created_at,
  };
}

export function listPublishedMarathons(): Marathon[] {
  return marathons
    .filter((m) => m.status === 'published')
    .sort((a, b) => b.event_date.localeCompare(a.event_date))
    .map(toPublicMarathon);
}

export interface StagingMarathon {
  id: string;
  name: string;
  event_date: string;
  area: string;
  source: string | null;
  content_hash: string | null;
  created_at: string;
}

export function listStagingMarathons(): StagingMarathon[] {
  return marathons
    .filter((m) => m.status === 'staging')
    .map((m) => ({
      id: m.id,
      name: m.name,
      event_date: m.event_date,
      area: m.area,
      source: m.source,
      content_hash: m.content_hash,
      created_at: m.created_at,
    }));
}

export function getAllContentHashes(): Set<string> {
  const set = new Set<string>();
  for (const m of marathons) {
    if (m.content_hash) {
      set.add(m.content_hash);
    }
  }
  return set;
}

export function addStagingMarathon(
  n: NormalizedMarathon,
  contentHash: string,
  nowIso: string,
): string {
  const id = randomUUID();
  marathons.push({
    id,
    name: n.name,
    event_date: n.event_date,
    start_time: null,
    end_time: null,
    area: n.area,
    lat: n.lat ?? null,
    lng: n.lng ?? null,
    organizer_name: n.organizer_name ?? null,
    organizer_url: n.organizer_url ?? null,
    organizer_contact: n.organizer_contact ?? null,
    organizer_email: n.organizer_email ?? null,
    detour_info: n.detour_info,
    source: n.source ?? 'ai',
    content_hash: contentHash,
    status: 'staging',
    created_at: nowIso,
  });
  return id;
}

export function promoteMarathon(id: string): boolean {
  const m = marathons.find((x) => x.id === id && x.status === 'staging');
  if (!m) {
    return false;
  }
  m.status = 'published';
  return true;
}

export function rejectMarathon(id: string): boolean {
  const m = marathons.find((x) => x.id === id && x.status === 'staging');
  if (!m) {
    return false;
  }
  m.status = 'archived';
  return true;
}

// ── 수집 ledger ───────────────────────────────────────────
export function addCollectionLog(entry: {
  run_id: string;
  target: string;
  content_hash: string | null;
  status: 'success' | 'failure' | 'skipped' | 'pending_review';
  quality_score: number | null;
  model: string | null;
  cost_usd: number | null;
  nowIso: string;
}): void {
  collectionLog.push({
    id: nextId('log'),
    run_id: entry.run_id,
    target: entry.target,
    content_hash: entry.content_hash,
    status: entry.status,
    quality_score: entry.quality_score,
    model: entry.model,
    cost_usd: entry.cost_usd,
    created_at: entry.nowIso,
  });
}

export function getTodayCostUsd(todayPrefix: string): number {
  return collectionLog
    .filter((l) => l.created_at.startsWith(todayPrefix))
    .reduce((s, l) => s + (l.cost_usd ?? 0), 0);
}

export interface CollectionMetrics {
  total_logged: number;
  staged: number;
  rejected: number;
  failed: number;
  skipped: number;
  pending_review: number;
  today_cost_usd: number;
  event_count: number;
}

export function getCollectionMetrics(todayPrefix: string): CollectionMetrics {
  const byStatus = (s: CollectionLogRow['status']) =>
    collectionLog.filter((l) => l.status === s).length;
  return {
    total_logged: collectionLog.length,
    staged: marathons.filter((m) => m.status === 'staging').length,
    rejected: byStatus('failure'),
    failed: byStatus('failure'),
    skipped: byStatus('skipped'),
    pending_review: byStatus('pending_review'),
    today_cost_usd: getTodayCostUsd(todayPrefix),
    event_count: events.length,
  };
}

// ── events ────────────────────────────────────────────────
export function addEvent(input: EventInput, nowIso: string): void {
  eventSeq += 1;
  events.push({
    id: eventSeq,
    event_type: input.event_type,
    marathon_id: input.marathon_id ?? null,
    created_at: nowIso,
  });
}

export function upsertDisruption(
  input: {
    marathon_id: string;
    minutes_lost: number;
    note?: string | null;
    display_name?: string | null;
  },
  deviceHash: string,
  nowIso: string,
): void {
  const existing = disruptions.find(
    (d) => d.marathon_id === input.marathon_id && d.device_hash === deviceHash,
  );
  if (existing) {
    existing.minutes_lost = input.minutes_lost;
    existing.note = input.note ?? null;
    existing.display_name = input.display_name ?? null;
    existing.created_at = nowIso;
    return;
  }
  disruptions.push({
    id: nextId('disr'),
    marathon_id: input.marathon_id,
    minutes_lost: input.minutes_lost,
    note: input.note ?? null,
    display_name: input.display_name ?? null,
    created_at: nowIso,
    device_hash: deviceHash,
  });
}

export function addComment(
  input: { marathon_id: string; body: string },
  deviceHash: string,
  nowIso: string,
): void {
  comments.push({
    id: nextId('cmt'),
    marathon_id: input.marathon_id,
    body: input.body,
    like_count: 0,
    created_at: nowIso,
    device_hash: deviceHash,
  });
}

export function addLike(commentId: string, deviceHash: string): void {
  const key = `${commentId}|${deviceHash}`;
  if (likes.has(key)) {
    return; // idempotent
  }
  likes.add(key);
  const c = comments.find((x) => x.id === commentId);
  if (c) {
    c.like_count += 1;
  }
}

export function addReport(
  input: { body: string; contact?: string | null },
  deviceHash: string,
  nowIso: string,
): void {
  reports.push({
    id: nextId('rep'),
    device_hash: deviceHash,
    body: input.body,
    contact: input.contact ?? null,
    created_at: nowIso,
  });
}
