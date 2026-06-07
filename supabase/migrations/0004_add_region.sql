-- 불편 입력에 휴리스틱 위치(region) 추가 + 공개 뷰 갱신.
-- region 은 클라이언트가 위치 권한 허용 시에만 대략 지역(도심/강남 등)으로 채운다.

alter table disruptions add column if not exists region text
  check (region is null or char_length(region) <= 40);

create or replace view v_disruptions_public as
select
  d.id,
  d.marathon_id,
  d.minutes_lost,
  d.note,
  d.display_name,
  d.created_at,
  d.region
from disruptions d
join marathons m on m.id = d.marathon_id and m.status = 'published';
