# DECISIONS — 아키텍처 의사결정 기록 (ADR)

> 스택·스키마·트레이드오프 결정을 시간순으로 기록. 번복 시 새 항목으로 추가(과거 항목 유지).

## ADR-001 · 프론트엔드: Next.js (App Router) — 2026-06-07
- 결정: Next.js 15 App Router + React 19 + TypeScript(strict).
- 근거: '여론 조성' 목적상 SSR + OG 메타로 SNS/검색 확산이 중요. 인터랙티브(실시간 집계/댓글)에도 적합.
- 대안: Vite SPA(SEO 약함), Astro(동적부분 복잡). 기각.

## ADR-002 · 백엔드: Supabase (Postgres) — 2026-06-07
- 결정: Supabase(Postgres + 익명 Auth + Realtime + Edge Function cron + RLS).
- 근거: 기기 기준 익명 식별·트래픽 스파이크·AI 수집 cron 쓰기를 한 플랫폼에서. prompt.md §03 정합.
- 대안: MongoDB(cron/실시간/접근제어 별도 구성). 기각.

## ADR-003 · 방향성: dual-track — 2026-06-07
- 결정: 주=공익+비침습 AdSense / 부=저비용 자산화 헤지(SEO·분석·데이터소유·문서화·템플릿화).
- 근거: Phase 0 리서치(docs/00_direction-report.md). 단일이슈·한국어·스파이크형은 매각 단독목표 경제성 미달.

## ADR-004 · 타입 안전: as 금지 — 2026-06-07
- 결정: TypeScript 타입 단언(as) 전면 금지. Zod 파싱 + type guard 로 대체.
- 적용: tsconfig strict + noUncheckedIndexedAccess, ESLint `consistent-type-assertions: never`, 환경변수 Zod 검증.
- 근거: CLAUDE.md [P1].

## ADR-005 · dev 모킹 / prod secret 주입 — 2026-06-07
- 결정: NEXT_PUBLIC_APP_MODE=mock(기본, 외부호출 없음) | live. secret 은 .env.local/배포 secret 으로만 주입.
- 근거: prompt.md §05 턴키. dev 에서 키 없이 전체 UI 동작 → 검수 용이.

## ADR-006 · 배포 출력: standalone — 2026-06-07
- 결정: next.config `output: 'standalone'` (Vultr Docker 자체호스팅 대비).
- 근거: prompt.md §03 Vultr VPC 호스팅. Phase 9에서 Dockerfile 로 활용.

## ADR-007 · 쓰기 아키텍처: 서버 경유(service_role) — 2026-06-07
- 결정: 모든 쓰기(불편입력/댓글/좋아요/신고/이벤트/수집)는 Next Route Handler 에서
  device_hash 를 IP/UA 로 서버 계산 후 service_role 로 수행. anon 직접 쓰기 전면 거부.
- 근거: device_hash 는 클라이언트가 스푸핑 가능 → 서버 계산 필수. 서버에서 Zod 검증·
  과도입력 필터·idempotent upsert 강제. (article 의 guardrail/idempotency 원칙.)
- 영향: client 는 공개 뷰(anon)로 읽기만, 쓰기는 Phase 5 의 Route Handler 로.

## ADR-008 · 공개 읽기: device_hash 제외 뷰 — 2026-06-07
- 결정: disruptions/comments 등은 베이스 SELECT 차단, device_hash 를 제외한 뷰
  (v_*_public)로만 anon 노출. 뷰는 owner 권한 실행(security_invoker off)으로 RLS 우회+컬럼필터.
- 근거: 익명 식별 해시를 외부에 노출하지 않기 위함(프라이버시/어뷰즈 방지).
