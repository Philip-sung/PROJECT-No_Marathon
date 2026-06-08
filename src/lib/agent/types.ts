import { z } from 'zod';

/**
 * 수집 에이전트 도메인 타입.
 * NormalizedMarathon: worker(Claude)가 산출하는 정형화된 마라톤 정보.
 * marathons 테이블과 호환되도록 설계(staging 으로 적재 후 검수 승격).
 */
// 모델은 "확인 안 된 값은 null" 로 채우라고 지시받는다 → 스키마는 그 null 을 거부하지 말고
// 관용적으로 정규화한다(.nullish()=null|undefined 허용 후 [] / undefined 로 변환).
export const DetourInfoSchema = z.object({
  subway: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  bus: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  note: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
});

export const ControlZoneSchema = z.object({
  // center 는 lat/lng 둘 다 실수일 때만 유지, 하나라도 null/누락이면 통째로 버린다.
  center: z
    .object({ lat: z.number().nullish(), lng: z.number().nullish() })
    .nullish()
    .transform((c) =>
      c && typeof c.lat === 'number' && typeof c.lng === 'number'
        ? { lat: c.lat, lng: c.lng }
        : undefined,
    ),
  radius_m: z
    .number()
    .positive()
    .max(20000)
    .nullish()
    .transform((v) => v ?? undefined),
  polygon: z
    .array(z.tuple([z.number(), z.number()]))
    .nullish()
    .transform((v) => v ?? undefined),
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
  // 필드 전체가 null 로 와도(모델 흔한 패턴) 거부하지 않게 preprocess 로 흡수.
  control_zone: z.preprocess(
    (v) => v ?? undefined,
    ControlZoneSchema.optional(),
  ),
  organizer_name: z.string().nullable().optional(),
  organizer_url: z.string().nullable().optional(),
  organizer_contact: z.string().nullable().optional(),
  organizer_email: z.string().nullable().optional(),
  detour_info: z.preprocess((v) => (v == null ? {} : v), DetourInfoSchema),
  source: z.string().nullable().optional(),
});
export type NormalizedMarathon = z.infer<typeof NormalizedMarathonSchema>;

/**
 * worker 는 한 타깃에서 "그 달 도로통제 마라톤을 전부 열거"하므로 결과가 리스트다.
 * 모델이 대회 1건이라 단일 객체로 반환해도 관용적으로 [객체] 로 정규화한다
 * (배열 강제 실패로 호출 전체를 버리지 않도록).
 */
export const NormalizedMarathonListSchema = z
  .preprocess((v) => (Array.isArray(v) ? v : [v]), z.array(z.unknown()))
  // 원소별로 검증해 유효한 대회만 통과시키고, 망가진 원소(이름·날짜 누락 등)는 버린다.
  // (배열 전체를 통으로 parse 하면 1건만 어긋나도 그 타깃의 모든 대회를 잃는다.)
  .transform((arr) =>
    arr.flatMap((el) => {
      const r = NormalizedMarathonSchema.safeParse(el);
      return r.success ? [r.data] : [];
    }),
  );
export type NormalizedMarathonList = z.infer<
  typeof NormalizedMarathonListSchema
>;

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
  | 'aborted_budget'
  | 'empty';

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
  /** 리포트 메일 발송 성공 여부(발송 시도 후 채워짐). */
  mail_sent?: boolean;
}
