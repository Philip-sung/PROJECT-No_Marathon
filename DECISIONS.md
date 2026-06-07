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

## ADR-014 · 실제 수집(web_search) + 간이 백오피스(/admin) — 2026-06-07
- 실제 수집: worker 가 Anthropic 서버 도구 web_search(`web_search_20260209`)로 웹을 검색해 정형화(live).
  worker 모델 Sonnet 4.6(검색 지원). claude.ts 가 pause_turn 재개·usage 합산 처리. mock 은 canned 유지.
- 거짓정보 방지: 검색으로 확인 안 된 값은 null, judge 품질 게이트(7) + dry-run staging + 사람 검수.
- 간이 백오피스 /admin: 관리자 번호(ADMIN_PASSCODE) 입력 → 전체 마라톤 확인·필드/JSON 수정·게시/보관.
  쓰기는 /api/admin/* (service_role/스토어). prompt.md "개발자가 보고 직접 수정" 충족.
- cron: 하루 1회(예 04:00). collect maxDuration 300(검색 지연 대비).

## ADR-013 · 우회 지도 + 통제정보 + 우회로 공유 — 2026-06-07
- 지도: Leaflet + OpenStreetMap(키 불필요, dev 즉시 동작). 동적 import(SSR 회피), circleMarker로 아이콘 에셋 회피.
- 통제구간: marathons.control_zone(jsonb: center/radius_m/polygon), 통제시간: start_time/end_time → formatControlPeriod.
  둘 다 없으면 "통제구간/시간 정보를 알 수 없습니다". AI 수집(NormalizedMarathon)이 채움(0005 마이그레이션).
- 우회로 공유: comments.channel('voice'|'detour') + region. detour 채널은 대략 위치(휴리스틱) 함께 표시.
- 대안 기각: Naver/Kakao 지도 JS(앱키+도메인 화이트리스트 → 턴키 저해). 외부 길찾기는 링크 유지.

## ADR-012 · 디자인: 다크 미래지향 + 모션 — 2026-06-07
- 결정: 다크 테마(near-black + 라디얼 글로우 + 미세 그리드), 네온 액센트(cyan/violet/rose),
  Pretendard, glassmorphism. 인터랙션은 framer-motion + 커스텀 CountUp(rAF).
- 핵심 인터랙션: 분노 페이지 합계 히어로 카운트업(글로우), 헤더 active layoutId pill,
  리스트/카드 등장·hover 모션, 선택 모달 AnimatePresence, 제출 토스트, 좋아요 탭 모션.
- 트레이드오프: framer-motion 으로 First Load ~50kB↑(104→159kB) — 인터랙티브 요구에 부합 판단.
- 홈은 서버 fetch(SSR/SEO) → 클라이언트 HomeView 모션 분리.
- 관측성: 구조적 JSON 로거, /api/health, /api/agent/metrics(ledger 파생), notify(Slack webhook+로그)=external escalation.
- 어뷰즈 방어: 인메모리 고정윈도우 rate limit(기기 기준, 쓰기 라우트, 초과 429). 다중 인스턴스 시 Redis 로 교체.
- 트래픽 스파이크: /api/summary 에 s-maxage=10 + stale-while-revalidate=30(edge/CDN 캐시).
- 자산화 헤지: events 테이블 + /api/events + page_view 비콘(Analytics). AdSense 는 NEXT_PUBLIC_ADSENSE_CLIENT
  설정 시 실광고, 미설정 시 placeholder(컨셉 보존).
- 검증: 429(rate limit), 캐시 헤더, health, metrics, event_count 스모크.

## ADR-010 · 수집 에이전트: 4-Layer + dry-run 검수 — 2026-06-07
- 결정: PDF TR-2026-04 의 4-Layer 를 수집 에이전트에 적용.
  L1=트리거 라우트(/api/agent/collect, x-agent-secret) · L2=ai_collection_log ledger + content_hash dedup
  · L3=Orchestrator(targets)-Worker(haiku)-Judge(sonnet) · L4=cost guardrail 4단 + LLM-as-judge 임계 + dry-run.
- 에이전트는 staging 까지만 적재. published 승격은 사람 검수(/api/agent/review). 자동 published 금지.
- model tier 분리(worker=haiku 저비용, judge=sonnet). 비용은 ledger 에 기록(per-day quota 근거).
- dev=mock(결정론 canned, 외부호출 0) / live=Anthropic Messages API(fetch) + service_role.
- 검증: mock E2E — staged 2 / rejected 1(judge<7) / 재실행 skipped 2(dedup) / publish→published 조회.

## ADR-009 · 마라톤 선택: URL ?m 동기화 시 useSearchParams 회피 — 2026-06-07
- 결정: MarathonProvider 는 useSearchParams 대신 마운트 후 window.location 에서 ?m 을 읽고,
  변경 시 router.replace 로 URL 갱신. (marathon) 레이아웃의 Suspense 제거.
- 근거: useSearchParams 는 Suspense 하위 전체를 클라이언트 전용 렌더로 전환시켜 /record·
  /detour 본문이 SSR HTML 에서 누락됨(SEO 손실, 빌드 스모크로 확인). window 직접 읽기로 SSR 복구.
- 트레이드오프: 초기 SSR 은 선택 미정(selected=null) 상태로 렌더, 선택은 하이드레이션 후 확정.
  구조적 콘텐츠(헤더/선택기/제목)는 SSR 되어 SEO 확보.
