-- ============================================================
-- 로컬 개발 seed (supabase db reset 시 적용)
-- 실데이터 아님 — 샘플. published 2건 + staging 1건.
-- ============================================================

insert into marathons (id, name, event_date, start_time, end_time, area, lat, lng,
  organizer_name, organizer_url, organizer_contact, organizer_email, detour_info,
  source, content_hash, status)
values
  ('11111111-1111-1111-1111-111111111111',
   '서울 봄 마라톤 (샘플)', '2026-04-19',
   '2026-04-19 07:00+09', '2026-04-19 13:00+09',
   '광화문·종로·을지로 일대', 37.5759, 126.9769,
   '○○마라톤조직위', 'https://example.org', '02-000-0000', 'organizer@example.org',
   '{"subway": ["1호선 우회", "5호선 광화문역 출구 일부 통제"], "bus": ["간선 03번 임시우회"]}'::jsonb,
   'seed', 'seed-hash-1', 'published'),
  ('22222222-2222-2222-2222-222222222222',
   '한강 가을 마라톤 (샘플)', '2026-10-11',
   '2026-10-11 08:00+09', '2026-10-11 12:00+09',
   '여의도·마포대교 일대', 37.5285, 126.9325,
   '△△러닝', 'https://example.org/2', null, 'run2@example.org',
   '{"subway": ["5호선 여의나루역 이용"], "bus": []}'::jsonb,
   'seed', 'seed-hash-2', 'published'),
  ('33333333-3333-3333-3333-333333333333',
   '검수 대기 마라톤 (staging 샘플)', '2026-11-01',
   null, null, '강남 일대', null, null,
   null, null, null, null, '{}'::jsonb,
   'ai', 'seed-hash-3', 'staging');

insert into disruptions (marathon_id, device_hash, minutes_lost, note, display_name)
values
  ('11111111-1111-1111-1111-111111111111', 'seed-device-a', 90,  '버스가 30분째 안 옴', '종로직장인'),
  ('11111111-1111-1111-1111-111111111111', 'seed-device-b', 45,  '병원 예약 놓칠 뻔', null),
  ('11111111-1111-1111-1111-111111111111', 'seed-device-c', 120, '택시도 못 잡음', '광화문주민'),
  ('22222222-2222-2222-2222-222222222222', 'seed-device-a', 30,  null, null);

insert into comments (id, marathon_id, device_hash, body, like_count)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'seed-device-b', '주말마다 이러니 너무 힘듭니다. 사전 공지라도 제대로 해줬으면.', 12),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'seed-device-c', '우회로 안내가 전혀 없어서 한참 헤맸어요.', 5),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'seed-device-a', '응급차는 어떻게 지나가나요? 대책이 필요합니다.', 0);
