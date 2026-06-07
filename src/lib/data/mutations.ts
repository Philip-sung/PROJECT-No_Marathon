import 'server-only';
import { isMock } from '@/lib/env';
import { createAdminSupabase } from '@/lib/supabase/admin';
import * as store from '@/lib/mock/store';
import type {
  DisruptionInput,
  CommentInput,
  ReportInput,
  EventInput,
} from '@/lib/db/schema';

/**
 * 서버 전용 쓰기(ADR-007). device_hash 는 호출하는 Route Handler 에서
 * IP/UA 로 계산해 전달한다. mock→인메모리 스토어, live→service_role.
 */

function nowIso(): string {
  return new Date().toISOString();
}

export async function writeDisruption(
  input: DisruptionInput,
  deviceHash: string,
): Promise<void> {
  if (isMock) {
    store.upsertDisruption(input, deviceHash, nowIso());
    return;
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return;
  }
  const { error } = await supabase.from('disruptions').upsert(
    {
      marathon_id: input.marathon_id,
      device_hash: deviceHash,
      minutes_lost: input.minutes_lost,
      note: input.note ?? null,
      display_name: input.display_name ?? null,
    },
    { onConflict: 'marathon_id,device_hash' },
  );
  if (error) {
    throw new Error(`불편 입력 실패: ${error.message}`);
  }
}

export async function writeComment(
  input: CommentInput,
  deviceHash: string,
): Promise<void> {
  if (isMock) {
    store.addComment(input, deviceHash, nowIso());
    return;
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return;
  }
  const { error } = await supabase.from('comments').insert({
    marathon_id: input.marathon_id,
    device_hash: deviceHash,
    body: input.body,
  });
  if (error) {
    throw new Error(`댓글 등록 실패: ${error.message}`);
  }
}

export async function writeLike(
  commentId: string,
  deviceHash: string,
): Promise<void> {
  if (isMock) {
    store.addLike(commentId, deviceHash);
    return;
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return;
  }
  // 복합 PK 충돌 시 무시 → idempotent.
  const { error } = await supabase
    .from('comment_likes')
    .upsert(
      { comment_id: commentId, device_hash: deviceHash },
      { onConflict: 'comment_id,device_hash', ignoreDuplicates: true },
    );
  if (error) {
    throw new Error(`좋아요 실패: ${error.message}`);
  }
}

export async function writeReport(
  input: ReportInput,
  deviceHash: string,
): Promise<void> {
  if (isMock) {
    store.addReport(input, deviceHash, nowIso());
    return;
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return;
  }
  const { error } = await supabase.from('reports').insert({
    device_hash: deviceHash,
    body: input.body,
    contact: input.contact ?? null,
  });
  if (error) {
    throw new Error(`신고 접수 실패: ${error.message}`);
  }
}

export async function writeEvent(
  input: EventInput,
  deviceHash: string,
): Promise<void> {
  if (isMock) {
    store.addEvent(input, nowIso());
    return;
  }
  const supabase = createAdminSupabase();
  if (!supabase) {
    return;
  }
  const { error } = await supabase.from('events').insert({
    event_type: input.event_type,
    marathon_id: input.marathon_id ?? null,
    device_hash: deviceHash,
    props: input.props ?? {},
  });
  if (error) {
    throw new Error(`이벤트 기록 실패: ${error.message}`);
  }
}
