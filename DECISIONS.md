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
