import 'server-only';
import {
  MOCK_MARATHONS,
  MOCK_DISRUPTIONS,
  MOCK_COMMENTS,
} from '@/lib/mock/fixtures';
import type {
  DisruptionPublic,
  CommentPublic,
  MarathonStats,
} from '@/lib/db/schema';

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
  const m = MOCK_MARATHONS.find((x) => x.id === marathonId);
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
  return MOCK_MARATHONS.map((m) => computeStats(m.id));
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
