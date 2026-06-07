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
