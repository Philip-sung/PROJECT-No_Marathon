import type {
  Marathon,
  MarathonStats,
  DisruptionPublic,
  CommentPublic,
} from '@/lib/db/schema';

/**
 * Mock fixture — dev(mock 모드)에서 외부 의존 없이 전체 UI 동작.
 * supabase/seed.sql 과 의미상 동일하게 유지한다.
 */

export const MOCK_MARATHONS: readonly Marathon[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
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
    created_at: '2026-03-01T00:00:00+09:00',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
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
    created_at: '2026-03-01T00:00:00+09:00',
  },
];

export const MOCK_STATS: readonly MarathonStats[] = [
  {
    marathon_id: '11111111-1111-1111-1111-111111111111',
    name: '서울 봄 마라톤 (샘플)',
    event_date: '2026-04-19',
    entry_count: 3,
    total_minutes: 255,
    avg_minutes: 85,
  },
  {
    marathon_id: '22222222-2222-2222-2222-222222222222',
    name: '한강 가을 마라톤 (샘플)',
    event_date: '2026-10-11',
    entry_count: 1,
    total_minutes: 30,
    avg_minutes: 30,
  },
];

export const MOCK_DISRUPTIONS: readonly DisruptionPublic[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    marathon_id: '11111111-1111-1111-1111-111111111111',
    minutes_lost: 120,
    note: '택시도 못 잡음',
    display_name: '광화문주민',
    created_at: '2026-04-19T10:00:00+09:00',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    marathon_id: '11111111-1111-1111-1111-111111111111',
    minutes_lost: 90,
    note: '버스가 30분째 안 옴',
    display_name: '종로직장인',
    created_at: '2026-04-19T09:30:00+09:00',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    marathon_id: '11111111-1111-1111-1111-111111111111',
    minutes_lost: 45,
    note: '병원 예약 놓칠 뻔',
    display_name: null,
    created_at: '2026-04-19T09:00:00+09:00',
  },
];

export const MOCK_COMMENTS: readonly CommentPublic[] = [
  {
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    marathon_id: '11111111-1111-1111-1111-111111111111',
    body: '주말마다 이러니 너무 힘듭니다. 사전 공지라도 제대로 해줬으면.',
    like_count: 12,
    created_at: '2026-04-19T11:00:00+09:00',
  },
  {
    id: 'aaaaaaaa-0000-0000-0000-000000000002',
    marathon_id: '11111111-1111-1111-1111-111111111111',
    body: '우회로 안내가 전혀 없어서 한참 헤맸어요.',
    like_count: 5,
    created_at: '2026-04-19T11:30:00+09:00',
  },
  {
    id: 'aaaaaaaa-0000-0000-0000-000000000003',
    marathon_id: '11111111-1111-1111-1111-111111111111',
    body: '응급차는 어떻게 지나가나요? 대책이 필요합니다.',
    like_count: 0,
    created_at: '2026-04-19T12:00:00+09:00',
  },
];
