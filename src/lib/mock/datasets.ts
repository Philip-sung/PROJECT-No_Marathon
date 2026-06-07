import 'server-only';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { NormalizedMarathon } from '@/lib/agent/types';

/**
 * ── 모든 시드 데이터의 단일 출처(SSOT) ──
 * 가짜 샘플/스트레스 mock 은 모두 제거했다. 실제로 수집·정제한 데이터만 둔다.
 * 주입은 환경변수 MOCK_DATASET 으로:
 *   'file'(폴더 JSON 로드, 기본 권장) | 'default'(= file 과 동일) | 'empty'(빈 상태).
 *   실 데이터는 mock-data/marathons.json (disruptions/comments 는 방문자 생성분이라 빈 상태).
 * store 는 getMockDataset() 으로 시드를 받아 메모리에 적재한다 — DB 로드와 동일 경로.
 *
 * 행(row) 스키마: 파일 로드 시 검증·기본값 채움(누락 필드 허용).
 */
const json = z.record(z.string(), z.unknown());

export const MarathonRowSchema = z.object({
  id: z.string().default(() => randomUUID()),
  name: z.string(),
  event_date: z.string(),
  start_time: z.string().nullable().default(null),
  end_time: z.string().nullable().default(null),
  area: z.string().default(''),
  lat: z.number().nullable().default(null),
  lng: z.number().nullable().default(null),
  organizer_name: z.string().nullable().default(null),
  organizer_url: z.string().nullable().default(null),
  organizer_contact: z.string().nullable().default(null),
  organizer_email: z.string().nullable().default(null),
  detour_info: json.default({}),
  control_zone: json.default({}),
  source: z.string().nullable().default('file'),
  content_hash: z.string().nullable().default(null),
  status: z.enum(['staging', 'published', 'archived']).default('published'),
  created_at: z.string().default('2026-01-01T00:00:00+09:00'),
});
export type MarathonRow = z.infer<typeof MarathonRowSchema>;

export const DisruptionRowSchema = z.object({
  id: z.string().default(() => randomUUID()),
  marathon_id: z.string(),
  device_hash: z.string().default('file-seed'),
  minutes_lost: z.number().int(),
  note: z.string().nullable().default(null),
  display_name: z.string().nullable().default(null),
  region: z.string().nullable().default(null),
  created_at: z.string().default('2026-01-01T00:00:00+09:00'),
});
export type DisruptionRow = z.infer<typeof DisruptionRowSchema>;

export const CommentRowSchema = z.object({
  id: z.string().default(() => randomUUID()),
  marathon_id: z.string(),
  device_hash: z.string().default('file-seed'),
  body: z.string(),
  like_count: z.number().int().default(0),
  channel: z.enum(['voice', 'detour']).default('voice'),
  region: z.string().nullable().default(null),
  created_at: z.string().default('2026-01-01T00:00:00+09:00'),
});
export type CommentRow = z.infer<typeof CommentRowSchema>;

export interface MockDataset {
  marathons: MarathonRow[];
  disruptions: DisruptionRow[];
  comments: CommentRow[];
}

// ── 파일(폴더) 로더 — DB 로드와 동일하게 store 시드로 들어감 ──
// MOCK_DATA_DIR(기본 'mock-data') 의 marathons.json / disruptions.json /
// comments.json 을 읽어 Zod 로 검증(누락 필드는 스키마 기본값으로 채움).
function loadJsonArray<S extends z.ZodTypeAny>(
  dir: string,
  file: string,
  schema: S,
): z.infer<S>[] {
  const path = join(process.cwd(), dir, file);
  if (!existsSync(path)) {
    return [];
  }
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return schema.array().parse(parsed);
}

function loadFromDir(dir: string): MockDataset {
  return {
    marathons: loadJsonArray(dir, 'marathons.json', MarathonRowSchema),
    disruptions: loadJsonArray(dir, 'disruptions.json', DisruptionRowSchema),
    comments: loadJsonArray(dir, 'comments.json', CommentRowSchema),
  };
}

// ── 데이터셋 선택(환경변수 주입) ───────────────────────────
export type MockDatasetName = 'default' | 'empty' | 'file';

export function getMockDatasetName(): MockDatasetName {
  const raw = (process.env.MOCK_DATASET ?? 'default').toLowerCase();
  if (raw === 'empty' || raw === 'file') {
    return raw;
  }
  return 'default';
}

export function getMockDataset(): MockDataset {
  const name = getMockDatasetName();
  if (name === 'empty') {
    return { marathons: [], disruptions: [], comments: [] };
  }
  // 'default' 와 'file' 모두 mock-data/ 의 실데이터(JSON)를 로드한다.
  return loadFromDir(process.env.MOCK_DATA_DIR ?? 'mock-data');
}

// ── 수집 에이전트(worker) mock 결과 ────────────────────────
// 실제 web_search 로 수집·정제한 결과(2026-06-07 기준). mock 모드의
// /api/agent/collect 가 cron 과 동일한 흐름으로 이 대회들을 staging + 리포트한다.
// 키는 targets.ts 의 ResearchTarget.key 와 매칭.
const IMBANK_OPEN: NormalizedMarathon = {
  name: '2026 iM뱅크 코리아 오픈 마라톤',
  event_date: '2026-06-07',
  area: '여의도공원·한강변 일대',
  start_time: '2026-06-07T07:30:00+09:00',
  end_time: '2026-06-07T13:00:00+09:00',
  lat: 37.527,
  lng: 126.9336,
  control_zone: {
    center: { lat: 37.527, lng: 126.9336 },
    radius_m: 1500,
    polygon: [
      [37.5283, 126.9252],
      [37.527, 126.9336],
      [37.5246, 126.9402],
      [37.5232, 126.9335],
      [37.5258, 126.9262],
    ],
  },
  organizer_name: 'iM뱅크',
  organizer_url: 'https://imrun.kr/marathon/code/8046/',
  organizer_contact: null,
  organizer_email: null,
  detour_info: {
    subway: ['5호선 여의도역 이용', '9호선 국회의사당역 이용'],
    bus: ['여의도 경유 버스 전 노선 임시 우회 운행'],
    note: '여의도공원 및 한강변 코스 통제. 대회 종료 전 차량 진입 불가.',
  },
  source: 'https://news.seoul.go.kr/culture/archives/533156',
};

const JTBC_SEOUL: NormalizedMarathon = {
  name: '2026 JTBC 서울마라톤',
  event_date: '2026-11-01',
  area: '상암월드컵경기장→여의도→광화문→잠실',
  start_time: '2026-11-01T08:00:00+09:00',
  end_time: '2026-11-01T15:00:00+09:00',
  lat: 37.5683,
  lng: 126.898,
  control_zone: {
    center: { lat: 37.527, lng: 126.9336 },
    radius_m: 3000,
    polygon: [
      [37.5683, 126.898],
      [37.527, 126.9336],
      [37.5759, 126.9769],
      [37.5152, 127.0731],
    ],
  },
  organizer_name: 'JTBC',
  organizer_url: 'http://marathon.jtbc.com/',
  organizer_contact: null,
  organizer_email: null,
  detour_info: {
    subway: ['6호선 월드컵경기장역', '5호선 여의도역', '2호선 잠실역'],
    bus: ['상암·여의도·광화문·잠실 구간 경유 버스 전 노선 임시 우회'],
    note: '서울 관통 42.195km 풀코스. 코스 전 구간 오전 5시부터 순차 통제.',
  },
  source: 'http://marathon.jtbc.com/',
};

const HANGANG_HALF: NormalizedMarathon = {
  name: '제3회 한강 서울 하프 마라톤',
  event_date: '2026-08-30',
  area: '여의도 한강공원·물빛광장',
  start_time: '2026-08-30T08:00:00+09:00',
  end_time: '2026-08-30T13:00:00+09:00',
  lat: 37.5283,
  lng: 126.9336,
  control_zone: {
    center: { lat: 37.5283, lng: 126.9336 },
    radius_m: 1200,
    polygon: [
      [37.529, 126.93],
      [37.5283, 126.9336],
      [37.5272, 126.942],
      [37.526, 126.95],
    ],
  },
  organizer_name: '서울스포츠(주)',
  organizer_url: 'https://seoulhalfrun.kr/',
  organizer_contact: null,
  organizer_email: null,
  detour_info: {
    subway: ['5호선 여의도역', '9호선 국회의사당역'],
    bus: ['여의도 한강공원 경유 버스 임시 우회 운행'],
    note: '여의도 한강공원 물빛광장 일대 통제. 5km·10km·하프 코스 운영.',
  },
  source: 'https://seoulhalfrun.kr/',
};

export const MOCK_RESEARCH: Record<string, NormalizedMarathon> = {
  'seoul-monthly-registry': IMBANK_OPEN,
  'seoul-upcoming': JTBC_SEOUL,
  'hangang-upcoming': HANGANG_HALF,
};

/** 매칭되는 타깃이 없을 때의 기본값(드물게 사용). */
export const MOCK_RESEARCH_FALLBACK: NormalizedMarathon = IMBANK_OPEN;
