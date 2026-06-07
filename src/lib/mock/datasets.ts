import 'server-only';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { NormalizedMarathon } from '@/lib/agent/types';

/**
 * ── 모든 모킹/시드 데이터의 단일 출처(SSOT) ──
 * 주입은 환경변수 MOCK_DATASET 으로:
 *   'default'(기본) | 'heavy'(대규모) | 'empty'(빈 상태) | 'file'(폴더 JSON 로드).
 *   예) .env.local 에 MOCK_DATASET=file  (+ MOCK_DATA_DIR=mock-data 기본)
 * store 는 getMockDataset() 으로 시드를 받아 메모리에 적재한다 — DB 로드와 동일 경로.
 *
 * 행(row) 스키마: 파일 로드 시 검증·기본값 채움(누락 필드 허용). device_hash 포함(내부 저장 형태).
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

const M1 = '11111111-1111-1111-1111-111111111111';
const M2 = '22222222-2222-2222-2222-222222222222';
const HEAVY = 'aaaa0000-0000-4000-8000-000000000000';

// ── 기본 마라톤(published 2개) ─────────────────────────────
function baseMarathons(): MarathonRow[] {
  return [
    {
      id: M1,
      name: '서울 봄 마라톤 (샘플)',
      event_date: '2026-04-19',
      start_time: '2026-04-19T07:00:00+09:00',
      end_time: '2026-04-19T13:00:00+09:00',
      area: '광화문·종로·을지로 일대',
      lat: 37.5759,
      lng: 126.9769,
      organizer_name: '○○마라톤조직위',
      organizer_url: 'https://example.org',
      organizer_contact: '02-000-0000',
      organizer_email: 'organizer@example.org',
      detour_info: {
        subway: ['1호선 우회', '5호선 광화문역 출구 일부 통제'],
        bus: ['간선 03번 임시우회'],
      },
      control_zone: {
        center: { lat: 37.5759, lng: 126.9769 },
        radius_m: 1500,
      },
      source: 'seed',
      content_hash: 'seed-0',
      status: 'published',
      created_at: '2026-03-01T00:00:00+09:00',
    },
    {
      id: M2,
      name: '한강 가을 마라톤 (샘플)',
      event_date: '2026-10-11',
      start_time: '2026-10-11T08:00:00+09:00',
      end_time: '2026-10-11T12:00:00+09:00',
      area: '여의도·마포대교 일대',
      lat: 37.5285,
      lng: 126.9325,
      organizer_name: '△△러닝',
      organizer_url: 'https://example.org/2',
      organizer_contact: null,
      organizer_email: 'run2@example.org',
      detour_info: { subway: ['5호선 여의나루역 이용'], bus: [] },
      control_zone: {
        center: { lat: 37.5285, lng: 126.9325 },
        radius_m: 1200,
      },
      source: 'seed',
      content_hash: 'seed-1',
      status: 'published',
      created_at: '2026-03-01T00:00:00+09:00',
    },
  ];
}

function baseDisruptions(): DisruptionRow[] {
  return [
    {
      id: 'd0000000-0000-4000-8000-000000000003',
      marathon_id: M1,
      device_hash: 'seed-device-c',
      minutes_lost: 120,
      note: '택시도 못 잡음',
      display_name: '광화문주민',
      region: '도심',
      created_at: '2026-04-19T10:00:00+09:00',
    },
    {
      id: 'd0000000-0000-4000-8000-000000000001',
      marathon_id: M1,
      device_hash: 'seed-device-a',
      minutes_lost: 90,
      note: '버스가 30분째 안 옴',
      display_name: '종로직장인',
      region: '도심',
      created_at: '2026-04-19T09:30:00+09:00',
    },
    {
      id: 'd0000000-0000-4000-8000-000000000002',
      marathon_id: M1,
      device_hash: 'seed-device-b',
      minutes_lost: 45,
      note: '병원 예약 놓칠 뻔',
      display_name: null,
      region: null,
      created_at: '2026-04-19T09:00:00+09:00',
    },
    {
      id: 'd0000000-0000-4000-8000-000000000004',
      marathon_id: M2,
      device_hash: 'seed-device-a',
      minutes_lost: 30,
      note: null,
      display_name: null,
      region: '여의도',
      created_at: '2026-10-11T09:00:00+09:00',
    },
  ];
}

function baseComments(): CommentRow[] {
  return [
    {
      id: 'aaaaaaaa-0000-4000-8000-000000000001',
      marathon_id: M1,
      device_hash: 'seed-c-1',
      body: '주말마다 이러니 너무 힘듭니다. 사전 공지라도 제대로 해줬으면.',
      like_count: 12,
      channel: 'voice',
      region: null,
      created_at: '2026-04-19T11:00:00+09:00',
    },
    {
      id: 'aaaaaaaa-0000-4000-8000-000000000002',
      marathon_id: M1,
      device_hash: 'seed-c-2',
      body: '우회로 안내가 전혀 없어서 한참 헤맸어요.',
      like_count: 5,
      channel: 'voice',
      region: null,
      created_at: '2026-04-19T11:30:00+09:00',
    },
    {
      id: 'aaaaaaaa-0000-4000-8000-000000000003',
      marathon_id: M1,
      device_hash: 'seed-c-3',
      body: '응급차는 어떻게 지나가나요? 대책이 필요합니다.',
      like_count: 0,
      channel: 'voice',
      region: null,
      created_at: '2026-04-19T12:00:00+09:00',
    },
    {
      id: 'bbbbbbbb-0000-4000-8000-000000000001',
      marathon_id: M1,
      device_hash: 'seed-d-1',
      body: '광화문 막히면 종각역에서 1호선 타고 시청 쪽으로 도세요. 버스보다 빠릅니다.',
      like_count: 8,
      channel: 'detour',
      region: '도심',
      created_at: '2026-04-19T09:40:00+09:00',
    },
    {
      id: 'bbbbbbbb-0000-4000-8000-000000000002',
      marathon_id: M1,
      device_hash: 'seed-d-2',
      body: '을지로 방면은 2호선 환승이 그나마 덜 막혔어요.',
      like_count: 3,
      channel: 'detour',
      region: '도심',
      created_at: '2026-04-19T10:05:00+09:00',
    },
  ];
}

// ── 대규모 시각 테스트용 생성기 ────────────────────────────
function heavyMarathon(): MarathonRow {
  return {
    id: HEAVY,
    name: '[테스트] 대규모 마라톤',
    event_date: '2026-05-03',
    start_time: '2026-05-03T07:00:00+09:00',
    end_time: '2026-05-03T14:00:00+09:00',
    area: '서울 도심 전역',
    lat: 37.5665,
    lng: 126.978,
    organizer_name: '테스트조직위',
    organizer_url: 'https://example.org/heavy',
    organizer_contact: '02-000-0000',
    organizer_email: 'heavy@example.org',
    detour_info: {
      subway: ['도심 전 노선 우회 권장', '1·2호선 환승 지연'],
      bus: ['도심 통과 간선 다수 지연·우회'],
    },
    control_zone: {
      center: { lat: 37.5665, lng: 126.978 },
      radius_m: 2500,
    },
    source: 'seed-heavy',
    content_hash: 'seed-heavy',
    status: 'published',
    created_at: '2026-05-01T00:00:00+09:00',
  };
}

function heavyDisruptions(count: number): DisruptionRow[] {
  const names: (string | null)[] = [
    '종로직장인',
    '광화문주민',
    '을지로상인',
    '시청통근러',
    '회기동학생',
    null,
  ];
  // 길이 7(타임스탬프 주기 360과 서로소) → 최신 항목 문구/지역 쏠림 방지.
  const regions = ['도심', '강남', '강북', '서부', '동부', '성동', null];
  const notes = [
    '버스가 30분째 안 와서 한참 기다렸어요.',
    '길이 다 막혀서 평소 10분 거리를 40분 걸렸습니다.',
    '택시도 안 잡히고 지하철역까지 한참 걸어갔어요.',
    '병원 예약 시간을 놓칠 뻔했습니다.',
    '아이 데리러 가는데 도로가 전부 통제됐어요.',
    '우회 안내가 없어서 어디로 가야 할지 몰랐습니다.',
    '출근길이 막혀 회사에 늦었습니다.',
  ];
  const rows: DisruptionRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const hh = String(6 + (i % 12)).padStart(2, '0');
    const mm = String(i % 60).padStart(2, '0');
    rows.push({
      id: randomUUID(),
      marathon_id: HEAVY,
      device_hash: `heavy-d-${i}`,
      minutes_lost: 30 + ((i * 13) % 451),
      note: notes[i % notes.length] ?? null,
      display_name: names[i % names.length] ?? null,
      region: regions[i % regions.length] ?? null,
      created_at: `2026-05-03T${hh}:${mm}:00+09:00`,
    });
  }
  return rows;
}

function heavyComments(count: number): CommentRow[] {
  // 시민 목소리(voice) — 불편·요구.
  const voiceBodies = [
    '주말마다 이러니 너무 힘듭니다.',
    '응급차는 어떻게 지나가나요? 대책이 필요합니다.',
    '우회 안내가 전혀 없어서 한참 헤맸어요.',
    '사전 공지라도 제대로 해주세요.',
    '버스가 30분 넘게 안 왔습니다.',
    '도심 통제 좀 분산해주세요.',
    '교통 영향 분석부터 공개했으면 합니다.',
  ];
  // 우회로 공유(detour) — 실제 우회 정보.
  const detourBodies = [
    '종각역에서 1호선 타고 시청 방면으로 우회했더니 빨랐어요.',
    '광화문 통제구간은 안국역(3호선)으로 돌아가세요.',
    '여의나루역(5호선) 환승이 가장 원활합니다.',
    '간선버스 대신 지하철 환승을 추천해요.',
    '시청 방면은 2호선이 그나마 덜 막힙니다.',
    '을지로 쪽은 2·3호선 환승으로 우회 가능해요.',
    '도심 진입은 포기하고 외곽 순환로로 도세요.',
  ];
  const detourRegions = ['도심', '강남', '강북', '서부', '동부'];
  const rows: CommentRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const hh = String(8 + (i % 10)).padStart(2, '0');
    const mm = String(i % 60).padStart(2, '0');
    const isDetour = i % 5 === 0;
    rows.push({
      id: randomUUID(),
      marathon_id: HEAVY,
      device_hash: `heavy-c-${i}`,
      body: isDetour
        ? (detourBodies[i % detourBodies.length] ?? '')
        : (voiceBodies[i % voiceBodies.length] ?? ''),
      like_count: i < 5 ? 120 - i * 18 : (i * 7) % 25,
      channel: isDetour ? 'detour' : 'voice',
      region: isDetour
        ? (detourRegions[i % detourRegions.length] ?? null)
        : null,
      created_at: `2026-05-03T${hh}:${mm}:00+09:00`,
    });
  }
  return rows;
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
export type MockDatasetName = 'default' | 'heavy' | 'empty' | 'file';

export function getMockDatasetName(): MockDatasetName {
  const raw = (process.env.MOCK_DATASET ?? 'default').toLowerCase();
  if (raw === 'heavy' || raw === 'empty' || raw === 'file') {
    return raw;
  }
  return 'default';
}

export function getMockDataset(): MockDataset {
  const name = getMockDatasetName();
  if (name === 'file') {
    return loadFromDir(process.env.MOCK_DATA_DIR ?? 'mock-data');
  }
  if (name === 'empty') {
    return { marathons: baseMarathons(), disruptions: [], comments: [] };
  }
  if (name === 'heavy') {
    return {
      marathons: [...baseMarathons(), heavyMarathon()],
      disruptions: [...baseDisruptions(), ...heavyDisruptions(480)],
      comments: [...baseComments(), ...heavyComments(80)],
    };
  }
  return {
    marathons: baseMarathons(),
    disruptions: baseDisruptions(),
    comments: baseComments(),
  };
}

// ── 수집 에이전트(worker) mock 결과 — 여기로 통합 ──────────
export const MOCK_RESEARCH: Record<string, NormalizedMarathon> = {
  'seoul-upcoming': {
    name: '서울 도심 봄 마라톤',
    event_date: '2026-04-26',
    area: '광화문·종로 일대',
    start_time: '2026-04-26T07:00:00+09:00',
    end_time: '2026-04-26T13:00:00+09:00',
    lat: 37.5759,
    lng: 126.9769,
    control_zone: { center: { lat: 37.5759, lng: 126.9769 }, radius_m: 1500 },
    organizer_name: '서울러닝협회',
    organizer_url: 'https://example.org/seoul-spring',
    organizer_contact: '02-123-4567',
    organizer_email: 'info@example.org',
    detour_info: {
      subway: ['1호선 종각역 이용', '5호선 광화문역 일부 출구 통제'],
      bus: ['간선 150번 임시 우회'],
    },
    source: 'mock://seoul-spring',
  },
  'hangang-upcoming': {
    name: '한강 가을 마라톤',
    event_date: '2026-10-18',
    area: '여의도·마포대교 일대',
    start_time: '2026-10-18T08:00:00+09:00',
    end_time: '2026-10-18T12:00:00+09:00',
    lat: 37.5285,
    lng: 126.9325,
    control_zone: { center: { lat: 37.5285, lng: 126.9325 }, radius_m: 1200 },
    organizer_name: '한강마라톤조직위',
    organizer_url: 'https://example.org/hangang',
    organizer_contact: null,
    organizer_email: 'hangang@example.org',
    detour_info: { subway: ['5호선 여의나루역 이용'], bus: [] },
    source: 'mock://hangang-autumn',
  },
  // 불완전 샘플 — 스키마 통과하나 품질(judge) 낮아 반려되는 경로 검증용.
  'incomplete-sample': {
    name: '정보 불완전 마라톤',
    event_date: '2026-12-01',
    area: '미상',
    detour_info: { subway: [], bus: [] },
    source: 'mock://incomplete',
  },
};

export const MOCK_RESEARCH_FALLBACK: NormalizedMarathon = MOCK_RESEARCH[
  'incomplete-sample'
] ?? {
  name: '정보 불완전 마라톤',
  event_date: '2026-12-01',
  area: '미상',
  detour_info: { subway: [], bus: [] },
  source: 'mock://incomplete',
};
