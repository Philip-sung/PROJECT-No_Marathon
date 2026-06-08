-- no-marathon.kr 전체 스키마 합본 (migrations/0001~0005 순서). SSOT 는 migrations/ 폴더.
-- 사용: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run (1회).
-- 주의: 이미 일부 적용돼 'already exists' 가 나면 그 테이블은 건너뛴 것 — 0003_views 부터만 다시 실행하면 됨.

-- ============================================================
-- migrations/0001_init.sql
-- ============================================================
-- ============================================================
-- no-marathon.kr — 초기 스키마 (Phase 2)
-- 설계 원칙:
--  · 기기 기준 익명 식별(device_hash) — 본인인증 없이 휴리스틱 1인 1회
--  · 과도입력 필터: DB CHECK 제약 + 앱 Zod 이중 방어
--  · idempotency: (marathon_id, device_hash) 유니크 / 좋아요 복합 PK
--  · dry-run: marathons.status = staging → published (수집 검수 후 승격)
--  · content_hash: AI 수집 변경 감지(중복 수집 회피)
--  · events: append-only 분석/자산화 테이블(dual-track 헤지)
-- 보안: 베이스 테이블은 anon SELECT 차단, device_hash 비노출.
--       공개 읽기는 device_hash 제외 뷰로만 노출.
-- ============================================================

create extension if not exists pgcrypto;

-- ── 공통: updated_at 자동 갱신 ──────────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ============================================================
-- 1. marathons — 마라톤 정보 (AI 수집 또는 수동)
-- ============================================================
create table marathons (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  event_date      date not null,
  start_time      timestamptz,
  end_time        timestamptz,
  area            text not null default '',
  lat             double precision,
  lng             double precision,
  organizer_name  text,
  organizer_url   text,
  organizer_contact text,
  organizer_email text,
  detour_info     jsonb not null default '{}'::jsonb,  -- 우회/대중교통 지침(페이지3)
  source          text,                                 -- 수집 출처
  content_hash    text,                                 -- 변경 감지
  status          text not null default 'staging'
                    check (status in ('staging', 'published', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_marathons_status_date on marathons (status, event_date desc);
create unique index uq_marathons_content_hash
  on marathons (content_hash) where content_hash is not null;
create trigger trg_marathons_updated
  before update on marathons
  for each row execute function set_updated_at();

-- ============================================================
-- 2. disruptions — 불편 시간 입력 (핵심 집계)
--    minutes_lost: 1~480분(8h) 하드 상한 = 과도입력 1차 필터
-- ============================================================
create table disruptions (
  id            uuid primary key default gen_random_uuid(),
  marathon_id   uuid not null references marathons (id) on delete cascade,
  device_hash   text not null,
  minutes_lost  integer not null check (minutes_lost between 1 and 480),
  note          text check (note is null or char_length(note) <= 500),
  display_name  text check (display_name is null or char_length(display_name) <= 40),
  created_at    timestamptz not null default now(),
  -- 휴리스틱 1인 1회(마라톤별). 재입력은 upsert 로 갱신.
  unique (marathon_id, device_hash)
);
create index idx_disruptions_marathon on disruptions (marathon_id);
create index idx_disruptions_top on disruptions (marathon_id, minutes_lost desc);

-- ============================================================
-- 3. comments — 무기명 댓글
-- ============================================================
create table comments (
  id           uuid primary key default gen_random_uuid(),
  marathon_id  uuid not null references marathons (id) on delete cascade,
  device_hash  text not null,
  body         text not null check (char_length(body) between 1 and 1000),
  like_count   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index idx_comments_likes on comments (marathon_id, like_count desc, created_at desc);
create index idx_comments_recent on comments (marathon_id, created_at desc);

-- ============================================================
-- 4. comment_likes — 좋아요(기기 기준 1회, idempotent)
-- ============================================================
create table comment_likes (
  comment_id   uuid not null references comments (id) on delete cascade,
  device_hash  text not null,
  created_at   timestamptz not null default now(),
  primary key (comment_id, device_hash)
);

create or replace function bump_comment_like_count() returns trigger
language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update comments set like_count = like_count + 1 where id = new.comment_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
    return old;
  end if;
  return null;
end; $$;
create trigger trg_comment_like
  after insert or delete on comment_likes
  for each row execute function bump_comment_like_count();

-- ============================================================
-- 5. reports — 앱 불편신고(개발자 수신, 공개 읽기 금지)
-- ============================================================
create table reports (
  id           uuid primary key default gen_random_uuid(),
  device_hash  text not null,
  body         text not null check (char_length(body) between 1 and 2000),
  contact      text check (contact is null or char_length(contact) <= 200),
  status       text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at   timestamptz not null default now()
);
create index idx_reports_status on reports (status, created_at desc);

-- ============================================================
-- 6. ai_collection_log — 수집 ledger (L2 state, service_role 전용)
-- ============================================================
create table ai_collection_log (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null,
  target        text not null,
  content_hash  text,
  status        text not null
                  check (status in ('success', 'failure', 'skipped', 'pending_review')),
  quality_score numeric(4, 1),     -- LLM-as-judge 0~10
  model         text,
  input_tokens  integer,
  output_tokens integer,
  cost_usd      numeric(10, 4),
  tool_calls    integer,
  notes         text,
  started_at    timestamptz,
  ended_at      timestamptz,
  created_at    timestamptz not null default now()
);
create index idx_collection_log_created on ai_collection_log (created_at desc);
create index idx_collection_log_status on ai_collection_log (status, created_at desc);

-- ============================================================
-- 7. events — append-only 분석/자산화 (dual-track 헤지)
-- ============================================================
create table events (
  id           bigint generated always as identity primary key,
  event_type   text not null,
  marathon_id  uuid references marathons (id) on delete set null,
  device_hash  text,
  props        jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index idx_events_type_time on events (event_type, created_at desc);
create index idx_events_marathon on events (marathon_id, created_at desc);

-- ============================================================
-- migrations/0002_rls.sql
-- ============================================================
-- ============================================================
-- RLS 정책 (Phase 2)
-- 쓰기 아키텍처(ADR-007): 모든 쓰기는 Next Route Handler(서버)에서
--   device_hash 를 IP/UA 로 직접 계산한 뒤 service_role 로 수행한다.
--   → 클라이언트가 device_hash 를 스푸핑할 수 없고, 서버에서 Zod 검증/
--     과도입력 필터/idempotent upsert 를 강제할 수 있다.
-- 따라서 anon/authenticated 에는 어떤 쓰기 정책도 부여하지 않는다(전면 거부).
-- service_role 은 BYPASSRLS 이므로 정책 없이 읽기/쓰기 가능.
-- 공개 읽기는 device_hash 를 제외한 뷰(0003)로만 노출.
-- ============================================================

alter table marathons        enable row level security;
alter table disruptions      enable row level security;
alter table comments         enable row level security;
alter table comment_likes    enable row level security;
alter table reports          enable row level security;
alter table ai_collection_log enable row level security;
alter table events           enable row level security;

-- 베이스 테이블 직접 SELECT: published 마라톤 목록만(타입드 클라이언트 대비).
-- 나머지 공개 읽기는 전부 뷰 경유.
grant select on marathons to anon, authenticated;
create policy marathons_select_published on marathons
  for select to anon, authenticated
  using (status = 'published');

-- disruptions/comments/comment_likes/reports/events/ai_collection_log:
--   anon/authenticated 정책 없음 → 직접 읽기/쓰기 전면 거부.
--   쓰기는 서버(service_role), 읽기는 0003 의 공개 뷰로만.

-- ============================================================
-- migrations/0003_views.sql
-- ============================================================
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

-- ============================================================
-- migrations/0004_add_region.sql
-- ============================================================
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

-- ============================================================
-- migrations/0005_control_zone_and_comment_channel.sql
-- ============================================================
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

