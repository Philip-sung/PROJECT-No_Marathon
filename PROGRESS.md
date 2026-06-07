# PROGRESS — no-marathon.kr

> 매 Phase 갱신. 신뢰 출처(context rot 방어). last-checked 기준 최신 상태만 유지하고 과거는 ARCHIVE.md로 compaction.

last-checked: 2026-06-07 (Phase 1 완료)

## Current
- Phase: **Phase 1 완료, Phase 2 대기**
- 다음 액션: 사용자 `다음` → Phase 2(데이터 모델 & Supabase 스키마 + RLS) 시작
- 방향 확정: dual-track (ADR-003).

## Done
- [x] PDF(TR-2026-04) 분석 + 4-Layer/4-Tier/품질기법 매핑
- [x] 스택 확정: Next.js(App Router) + Supabase, dual-track 방향
- [x] PLAN.md / SOUL.md / PROGRESS.md 작성 (빌드 하니스 가동)
- [x] Phase 0 — 리서치 & 방향 권고 (docs/00_direction-report.md, 채점 8.5/10)
- [x] Phase 1 — 부트스트랩 (Next.js15+Supabase+Zod+Tailwind, env/mock 분리, CI, DECISIONS) 채점 9/10
      검증: typecheck·lint·build·format 전부 통과

## Queue (Phase 2 → 9)
- [ ] Phase 2 — 데이터 모델 & Supabase 스키마 + RLS
- [ ] Phase 3 — 공유 레이아웃 & 마라톤 선택 컨텍스트
- [ ] Phase 4 — 페이지 ① 취지
- [ ] Phase 5 — 페이지 ② 분노 해소 집계 (메인)
- [ ] Phase 6 — 페이지 ③ 우회 대응
- [ ] Phase 7 — 자율 데이터 수집 에이전트 (4-Layer)
- [ ] Phase 8 — 가드레일·관측성·비용·트래픽
- [ ] Phase 9 — 배포 & 턴키 인계

## Decisions pending
- 방향 트랙 최종 확정(Phase 0 후), 호스팅 형상(Phase 1), 지도 API(Phase 6), 수집 주기(Phase 7)
