-- 우회 페이지: 통제구간(지도용 geo) + 댓글 채널(voice|detour) + 댓글 위치(region)
-- AI 수집 에이전트가 control_zone / start_time / end_time 을 채운다.

alter table marathons
  add column if not exists control_zone jsonb not null default '{}'::jsonb;

alter table comments
  add column if not exists channel text not null default 'voice'
    check (channel in ('voice', 'detour'));
alter table comments
  add column if not exists region text
    check (region is null or char_length(region) <= 40);

create index if not exists idx_comments_channel
  on comments (marathon_id, channel, created_at desc);

-- 공개 뷰 갱신(기존 컬럼 뒤에 추가 — CREATE OR REPLACE 제약 준수)
create or replace view v_marathons_public as
select
  id, name, event_date, start_time, end_time, area, lat, lng,
  organizer_name, organizer_url, organizer_contact, organizer_email,
  detour_info, created_at, control_zone
from marathons
where status = 'published';

create or replace view v_comments_public as
select
  c.id, c.marathon_id, c.body, c.like_count, c.created_at, c.channel, c.region
from comments c
join marathons m on m.id = c.marathon_id and m.status = 'published';
