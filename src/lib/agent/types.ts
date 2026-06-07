import { z } from 'zod';

/**
 * 수집 에이전트 도메인 타입.
 * NormalizedMarathon: worker(Claude)가 산출하는 정형화된 마라톤 정보.
 * marathons 테이블과 호환되도록 설계(staging 으로 적재 후 검수 승격).
 */
export const DetourInfoSchema = z.object({
  subway: z.array(z.string()).default([]),
  bus: z.array(z.string()).default([]),
  note: z.string().optional(),
});

export const ControlZoneSchema = z.object({
  center: z.object({ lat: z.number(), lng: z.number() }).optional(),
  radius_m: z.number().positive().max(20000).optional(),
  polygon: z.array(z.tuple([z.number(), z.number()])).optional(),
});
export type ControlZone = z.infer<typeof ControlZoneSchema>;

export const NormalizedMarathonSchema = z.object({
  name: z.string().min(1),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식'),
  area: z.string().min(1),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  control_zone: ControlZoneSchema.optional(),
  organizer_name: z.string().nullable().optional(),
  organizer_url: z.string().nullable().optional(),
  organizer_contact: z.string().nullable().optional(),
  organizer_email: z.string().nullable().optional(),
  detour_info: DetourInfoSchema.default({ subway: [], bus: [] }),
  source: z.string().nullable().optional(),
});
export type NormalizedMarathon = z.infer<typeof NormalizedMarathonSchema>;

/** LLM-as-judge 결과. */
export const JudgeResultSchema = z.object({
  score: z.number().min(0).max(10),
  issues: z.array(z.string()).default([]),
});
export type JudgeResult = z.infer<typeof JudgeResultSchema>;

/** 토큰 사용량(비용 가드레일용). */
export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

/** 한 타깃 처리 결과. */
export type TargetOutcome =
  | 'staged'
  | 'skipped_duplicate'
  | 'rejected_quality'
  | 'failed'
  | 'aborted_budget';

export interface TargetResult {
  target: string;
  outcome: TargetOutcome;
  quality_score: number | null;
  cost_usd: number;
  notes: string | null;
}

export interface CollectionRunResult {
  run_id: string;
  targets: number;
  staged: number;
  skipped: number;
  rejected: number;
  failed: number;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  escalated: boolean;
  results: TargetResult[];
}
