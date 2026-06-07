import 'server-only';
import { randomUUID } from 'node:crypto';
import type { NormalizedMarathon } from '@/lib/agent/types';

/**
 * ── 모든 모킹/시드 데이터의 단일 출처(SSOT) ──
 * 흩어져 있던 fixtures/store-heavy/agent-mock 을 여기로 통합.
 * 주입은 환경변수 MOCK_DATASET 으로: 'default'(기본) | 'heavy'(대규모) | 'empty'(빈 상태).
 *   예) .env.local 에 MOCK_DATASET=heavy
 * store 는 getMockDataset() 으로 시드를 받아 메모리에 적재한다.
 */

// ── 행(row) 타입: device_hash 포함(내부 저장 형태) ──────────
export interface MarathonRow {
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
export interface DisruptionRow {
  id: string;
  marathon_id: string;
  device_hash: string;
  minutes_lost: number;
  note: string | null;
  display_name: string | null;
  region: string | null;
  created_at: string;
}
export interface CommentRow {
  id: string;
  marathon_id: string;
  device_hash: string;
  body: string;
  like_count: number;
  created_at: string;
}
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
      created_at: '2026-04-19T11:00:00+09:00',
    },
    {
      id: 'aaaaaaaa-0000-4000-8000-000000000002',
      marathon_id: M1,
      device_hash: 'seed-c-2',
      body: '우회로 안내가 전혀 없어서 한참 헤맸어요.',
      like_count: 5,
      created_at: '2026-04-19T11:30:00+09:00',
    },
    {
      id: 'aaaaaaaa-0000-4000-8000-000000000003',
      marathon_id: M1,
      device_hash: 'seed-c-3',
      body: '응급차는 어떻게 지나가나요? 대책이 필요합니다.',
      like_count: 0,
      created_at: '2026-04-19T12:00:00+09:00',
    },
  ];
}

// ── 대규모 시각 테스트용 생성기 ────────────────────────────
function heavyMarathon(): MarathonRow {
  return {
    id: HEAVY,
    name: '[테스트] 대규모 마라톤',
    event_date: '2026-05-03',
    start_time: null,
    end_time: null,
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
  const regions = ['도심', '강남', '강북', '서부', '동부', null];
  const rows: DisruptionRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const hh = String(6 + (i % 12)).padStart(2, '0');
    const mm = String(i % 60).padStart(2, '0');
    rows.push({
      id: randomUUID(),
      marathon_id: HEAVY,
      device_hash: `heavy-d-${i}`,
      minutes_lost: 30 + ((i * 13) % 451),
      note:
        i % 3 === 0
          ? '버스가 한참 안 옴'
          : i % 3 === 1
            ? '길이 다 막혀 한참 걸림'
            : null,
      display_name: names[i % names.length] ?? null,
      region: regions[i % regions.length] ?? null,
      created_at: `2026-05-03T${hh}:${mm}:00+09:00`,
    });
  }
  return rows;
}

function heavyComments(count: number): CommentRow[] {
  const bodies = [
    '주말마다 이러니 너무 힘듭니다.',
    '응급차는 어떻게 지나가나요? 대책이 필요합니다.',
    '우회 안내가 전혀 없어서 한참 헤맸어요.',
    '사전 공지라도 제대로 해주세요.',
    '버스가 30분 넘게 안 왔습니다.',
    '도심 통제 좀 분산해주세요.',
  ];
  const rows: CommentRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const hh = String(8 + (i % 10)).padStart(2, '0');
    const mm = String(i % 60).padStart(2, '0');
    rows.push({
      id: randomUUID(),
      marathon_id: HEAVY,
      device_hash: `heavy-c-${i}`,
      body: `${bodies[i % bodies.length] ?? ''} (#${i + 1})`,
      like_count: i < 5 ? 120 - i * 18 : (i * 7) % 25,
      created_at: `2026-05-03T${hh}:${mm}:00+09:00`,
    });
  }
  return rows;
}

// ── 데이터셋 선택(환경변수 주입) ───────────────────────────
export type MockDatasetName = 'default' | 'heavy' | 'empty';

export function getMockDatasetName(): MockDatasetName {
  const raw = (process.env.MOCK_DATASET ?? 'default').toLowerCase();
  if (raw === 'heavy' || raw === 'empty') {
    return raw;
  }
  return 'default';
}

export function getMockDataset(): MockDataset {
  const name = getMockDatasetName();
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
  'seoul-spring': {
    name: '서울 도심 봄 마라톤',
    event_date: '2026-04-26',
    area: '광화문·종로 일대',
    lat: 37.5759,
    lng: 126.9769,
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
  'hangang-autumn': {
    name: '한강 가을 마라톤',
    event_date: '2026-10-18',
    area: '여의도·마포대교 일대',
    lat: 37.5285,
    lng: 126.9325,
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
