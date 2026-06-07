# PROGRESS — no-marathon.kr

> 매 Phase 갱신. 신뢰 출처(context rot 방어). last-checked 기준 최신 상태만 유지하고 과거는 ARCHIVE.md로 compaction.

last-checked: 2026-06-07 (Phase 8 완료)

## Current
- Phase: **Phase 8 완료, Phase 9 대기 (마지막)**
- 다음 액션: 사용자 `다음` → Phase 9(배포 & 턴키 인계) 시작
- 미결/이월(Phase 9 또는 live): 실시간(Supabase realtime) 미구현(현재 fetch 갱신).
  rate limit/스토어는 인메모리(단일 인스턴스). live 경로(Supabase/Anthropic)는 키 연결 시 실검증.
  신고/escalation 메일은 SLACK_WEBHOOK_URL 또는 메일 연동 시 활성(현재 로그).
- 방향 확정: dual-track (ADR-003). 쓰기=서버경유(ADR-007), 공개읽기=뷰(ADR-008), 선택 URL동기화(ADR-009).
- 미결: 취지 페이지(Phase 4) "여론 기반 대책" 데이터 모델 — 정적/별도필드 여부 Phase 4에서 결정.
- 주의: SQL 은 실DB 미적용(로컬 psql/supabase CLI 없음). Supabase 프로젝트 연결 시 적용.
        mock fixture 를 z.infer 타입으로 강제해 스키마-목 정합성은 tsc 로 검증함.
- 라우트: / (취지) · /record (불편기록) · /detour (우회안내). (marathon) 그룹이 선택 공유.

## Done
- [x] PDF(TR-2026-04) 분석 + 4-Layer/4-Tier/품질기법 매핑
- [x] 스택 확정: Next.js(App Router) + Supabase, dual-track 방향
- [x] PLAN.md / SOUL.md / PROGRESS.md 작성 (빌드 하니스 가동)
- [x] Phase 0 — 리서치 & 방향 권고 (docs/00_direction-report.md, 채점 8.5/10)
- [x] Phase 1 — 부트스트랩 (Next.js15+Supabase+Zod+Tailwind, env/mock 분리, CI, DECISIONS) 채점 9/10
      검증: typecheck·lint·build·format 전부 통과
- [x] Phase 2 — 데이터 모델(7테이블+뷰+RLS), Zod 도메인 스키마, 과도입력 필터, 기기해시,
      mock fixture 정합. 채점 8.5/10. 검증: typecheck·lint·build·format 통과
- [x] Phase 3 — 글로벌 헤더(3메뉴), 마라톤 선택 컨텍스트(시간+위치 최근접, 모달, URL동기화),
      (marathon) 그룹 공유, per-page OG/SEO, SSR 복구. 채점 9/10. 검증: 게이트 통과 + 런타임 스모크
- [x] Phase 4 — 취지 페이지(정제 카피 + 집계 헤드라인 데이터/스토리 + 여론기반 대책5 + CTA).
      대책=정적초안 데이터모델(Phase 7 교체 seam). 채점 9/10. 검증: 게이트+SSR 스모크
- [x] Phase 5 — 메인(분노해소): 합계 헤드라인, 불편자 리스트, 입력폼(과도입력 필터+idempotent),
      주최정보, 무기명 댓글(top5+최신)+좋아요, 앱신고(메일 secret), AdSlot. 서버 Route Handler 쓰기.
      mock 인메모리 스토어. 채점 9.5/10. 검증: E2E 스모크(입력→집계, 400, idempotency, 댓글/좋아요/신고)
- [x] Phase 6 — 우회 안내: 위치 권한 단계적(선택)+거리 점증 안내, detour_info(Zod 파싱) 지하철/버스,
      권한거부 graceful, 외부 지도(네이버/카카오) 링크. 채점 9/10. 검증: 게이트+200 스모크
- [x] Phase 7 — 수집 에이전트(4-Layer): L1 트리거 라우트, L2 ledger+content_hash dedup,
      L3 Orchestrator-Worker(haiku)-Judge(sonnet), L4 cost guardrail 4단+LLM-judge+dry-run staging+검수+auth.
      mock 결정론/ live Anthropic fetch. 채점 9/10. 검증: E2E(staged2/rejected1/dedup skipped2/publish→published)
- [x] Phase 8 — 관측성(로거/health/metrics/notify-escalation), rate limit(429), summary 캐싱,
      events+page_view 비콘, AdSense 게이팅. 채점 9/10. 검증: health/429/캐시헤더/metrics 스모크

## Queue (Phase 9)
- [ ] Phase 9 — 배포 & 턴키 인계
- [ ] Phase 3 — 공유 레이아웃 & 마라톤 선택 컨텍스트
- [ ] Phase 4 — 페이지 ① 취지
- [ ] Phase 5 — 페이지 ② 분노 해소 집계 (메인)
- [ ] Phase 6 — 페이지 ③ 우회 대응
- [ ] Phase 7 — 자율 데이터 수집 에이전트 (4-Layer)
- [ ] Phase 8 — 가드레일·관측성·비용·트래픽
- [ ] Phase 9 — 배포 & 턴키 인계

## Decisions pending
- 방향 트랙 최종 확정(Phase 0 후), 호스팅 형상(Phase 1), 지도 API(Phase 6), 수집 주기(Phase 7)
