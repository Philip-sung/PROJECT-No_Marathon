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
