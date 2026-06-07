import { z } from 'zod';
import { LIMITS } from '@/lib/db/constants';

/**
 * 도메인 스키마 — DB 스키마(supabase/migrations)와 1:1 대응.
 * CLAUDE.md [P1]: 타입 단언(as) 없이 Zod 파싱 + z.infer 로 타입 도출.
 * 입력 스키마는 서버 경계에서 과도입력 필터로 사용한다.
 */

// ── 엔티티(공개 뷰 기준) ───────────────────────────────────
export const MarathonSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  event_date: z.string(), // ISO date
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  area: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  organizer_name: z.string().nullable(),
  organizer_url: z.string().nullable(),
  organizer_contact: z.string().nullable(),
  organizer_email: z.string().nullable(),
  detour_info: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});
export type Marathon = z.infer<typeof MarathonSchema>;

export const DisruptionPublicSchema = z.object({
  id: z.string().uuid(),
  marathon_id: z.string().uuid(),
  minutes_lost: z.number().int(),
  note: z.string().nullable(),
  display_name: z.string().nullable(),
  created_at: z.string(),
});
export type DisruptionPublic = z.infer<typeof DisruptionPublicSchema>;

export const CommentPublicSchema = z.object({
  id: z.string().uuid(),
  marathon_id: z.string().uuid(),
  body: z.string(),
  like_count: z.number().int(),
  created_at: z.string(),
});
export type CommentPublic = z.infer<typeof CommentPublicSchema>;

export const MarathonStatsSchema = z.object({
  marathon_id: z.string().uuid(),
  name: z.string(),
  event_date: z.string(),
  entry_count: z.number().int(),
  total_minutes: z.number().int(),
  avg_minutes: z.number().int(),
});
export type MarathonStats = z.infer<typeof MarathonStatsSchema>;

// ── 입력(서버 경계 검증 = 과도입력 필터) ────────────────────
export const DisruptionInputSchema = z.object({
  marathon_id: z.string().uuid(),
  minutes_lost: z
    .number()
    .int()
    .min(LIMITS.disruptionMinMinutes)
    .max(LIMITS.disruptionMaxMinutes),
  note: z.string().max(LIMITS.noteMax).optional().nullable(),
  display_name: z.string().max(LIMITS.displayNameMax).optional().nullable(),
});
export type DisruptionInput = z.infer<typeof DisruptionInputSchema>;

export const CommentInputSchema = z.object({
  marathon_id: z.string().uuid(),
  body: z.string().min(LIMITS.commentMin).max(LIMITS.commentMax),
});
export type CommentInput = z.infer<typeof CommentInputSchema>;

export const ReportInputSchema = z.object({
  body: z.string().min(LIMITS.reportMin).max(LIMITS.reportMax),
  contact: z.string().max(LIMITS.contactMax).optional().nullable(),
});
export type ReportInput = z.infer<typeof ReportInputSchema>;

export const EventInputSchema = z.object({
  event_type: z.enum([
    'page_view',
    'marathon_select',
    'disruption_submit',
    'comment_submit',
    'comment_like',
    'report_submit',
  ]),
  marathon_id: z.string().uuid().optional().nullable(),
  props: z.record(z.string(), z.unknown()).optional(),
});
export type EventInput = z.infer<typeof EventInputSchema>;
