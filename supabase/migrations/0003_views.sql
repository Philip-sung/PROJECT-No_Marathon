-- ============================================================
-- 공개 읽기 뷰 + 집계 (Phase 2)
-- 뷰는 소유자(postgres) 권한으로 실행(security_invoker 미설정)되어
-- 베이스 테이블 RLS 를 우회하되, device_hash 등 민감 컬럼은 제외한다.
-- published 마라톤에 속한 행만 노출.
-- ============================================================

-- ── 불편 입력 공개 뷰(device_hash 제외) ──────────────────────
create view v_disruptions_public as
select
  d.id,
  d.marathon_id,
  d.minutes_lost,
  d.note,
  d.display_name,
  d.created_at
from disruptions d
join marathons m on m.id = d.marathon_id and m.status = 'published';

-- ── 댓글 공개 뷰(device_hash 제외) ──────────────────────────
create view v_comments_public as
select
  c.id,
  c.marathon_id,
  c.body,
  c.like_count,
  c.created_at
from comments c
join marathons m on m.id = c.marathon_id and m.status = 'published';

-- ── 마라톤별 집계(최상단 "불편 시간 합") ─────────────────────
create view v_marathon_stats as
select
  m.id as marathon_id,
  m.name,
  m.event_date,
  coalesce(count(d.id), 0)               as entry_count,
  coalesce(sum(d.minutes_lost), 0)       as total_minutes,
  coalesce(round(avg(d.minutes_lost)), 0) as avg_minutes
from marathons m
left join disruptions d on d.marathon_id = m.id
where m.status = 'published'
group by m.id, m.name, m.event_date;

-- 공개 마라톤 목록(선택 UI용, 민감정보 일부 노출 가능 — 주최정보는 공개 대상)
create view v_marathons_public as
select
  id, name, event_date, start_time, end_time, area, lat, lng,
  organizer_name, organizer_url, organizer_contact, organizer_email,
  detour_info, created_at
from marathons
where status = 'published';

-- 뷰 읽기 권한 부여
grant select on v_disruptions_public to anon, authenticated;
grant select on v_comments_public    to anon, authenticated;
grant select on v_marathon_stats     to anon, authenticated;
grant select on v_marathons_public   to anon, authenticated;
