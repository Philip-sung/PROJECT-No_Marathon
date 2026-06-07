# no-marathon.kr — 구현 마스터 플랜

> 자율 LLM 에이전트 오케스트레이션(TR-2026-04) 기법을 빌드 과정과 제품 양쪽에 적용한
> "다음" 게이트 기반 턴키 구현 플랜. 사용자는 각 Phase 완료 후 `다음`만 입력하면 다음 단계로 진행한다.

---

## 0. 이 플랜 사용법

- **진행 방식**: Phase 0 → 9 를 순서대로 진행한다. 각 Phase는 한 번의 `다음`으로 시작한다.
- **휴먼 게이트(Human-in-the-loop interrupt)**: 각 Phase 끝에는 자동 진행하지 않는 정지점이 있다.
  사용자의 `다음`이 곧 article의 human-in-the-loop interrupt(first-class) 역할이다.
- **품질 게이트(LLM-as-judge)**: 각 Phase는 "완료 기준"을 self-check(0~10 채점)로 통과해야 done 처리한다.
  임계(7점) 미달 시 해당 Phase 내에서 보정 후 재채점한다. silent failure 방지.
- **체크포인트**: 각 Phase 완료 시 git commit(`phase-N: <title>`)으로 스냅샷을 남긴다(replay/rollback 가능).
- **상태 기반 진행(context rot 방어)**: 매 Phase는 장문 대화 의존 대신 `PROGRESS.md` / `SOUL.md` / `DECISIONS.md`
  를 먼저 읽고 시작한다. 완료된 Phase 기록은 누적되면 `ARCHIVE.md`로 compaction한다.
- **변경 요청**: 어느 Phase에서든 "수정: ~" 라고 하면 해당 Phase 범위에서 반영하고 재채점한다.

---

## A. 확정 사항

| 항목 | 결정 |
|---|---|
| 제품 | no-marathon.kr — 주말 서울 마라톤 교통통제 반대 여론 조성 공익 사이트 |
| 페이지 | ① 취지  ② 분노해소 집계(메인)  ③ 우회 대응 |
| 프론트엔드 | **Next.js (App Router)** — SSR + OG 메타로 SNS/검색 확산 |
| 백엔드/DB | **Supabase (Postgres)** — 익명 Auth·실시간·Edge Function cron·RLS |
| 호스팅 | Vultr VPC + 도메인(no-marathon.kr), HTTPS |
| AI | Claude API로 마라톤/주최/우회로 정보 수집·정형화·등록 (자율 에이전트) |
| 방향성(dual-track) | 운영=공익+AdSense, 설계=매각 가능 자산 수준 유지. Phase 0 리서치로 트랙 확정 |
| 개발 원칙 | TS strict, `as` 금지(Zod+type guard), dev는 모킹 / prod는 secret 주입 |

---

## B. PDF 기법 → 이 프로젝트 매핑

### 4-Layer 아키텍처 (제품의 데이터 수집 에이전트에 적용 — Phase 7)
- **L1 Heartbeat**: Supabase Edge Function + cron 스케줄(간격/지터). 마라톤 정보 주기 수집.
- **L2 Persistent State**: 수집 ledger + `content_hash` 기반 변경 감지(중복 수집 회피), last-checked.
- **L3 Orchestrator-Worker**: Lead(어떤 마라톤을 조사할지 plan) → Worker(Claude API 검색·정형화) →
  결과 필터 후 DB 등록. subagent = intelligent filter, model tier 분리(Lead=Opus, Worker=Sonnet/Haiku).
- **L4 Guardrails**: cost guardrail 4단, allowed-tools, dry-run(staging 등록 후 개발자 검수), idempotency,
  LLM-as-judge 품질 채점, external escalation(이상 시 일시정지·알림).

### 4-Layer (빌드 과정 자체에도 적용 — Phase 1 빌드 하니스)
- L1 = 사용자의 `다음` 트리거 / L2 = PROGRESS·SOUL·DECISIONS 상태파일 /
  L3 = 단계별 오케스트레이션(필요 시 Explore·Plan 서브에이전트 fan-out) / L4 = Phase별 품질게이트·git 체크포인트.

### 4-Tier 로드맵 대응
- Tier 1(baseline) → Phase 7 의 cron+TASKS형 최소 수집.
- Tier 2(structured memory + 2-tier cron) → Phase 7 의 read-only/write 분리·compaction.
- Tier 3(observability) → Phase 8 의 관측성 4층·ledger·LLM-as-judge.
- Tier 4(production-grade) → Phase 8~9 의 escalation·audit log·sandbox·SLA·배포.

### 품질 기법 체크리스트 (전 Phase 공통 적용)
- [ ] Persistent state로 context rot 방어 (장문 의존 금지)
- [ ] SOUL.md로 specification drift 방어 (정체성·하드제약 고정)
- [ ] Phase별 LLM-as-judge self-verification (silent failure 방지)
- [ ] Human-in-the-loop = `다음` 게이트
- [ ] idempotency (수집·집계·입력 중복 안전)
- [ ] dry-run first (destructive·AI 등록은 staging 후 검수)
- [ ] allowed-tools / secret 분리 / RLS (최소 권한)
- [ ] cost guardrail 4단 (runaway 비용 차단)
- [ ] tool description engineering (수집 에이전트 도구 자족·비중복)
- [ ] git 체크포인트 per Phase (replay/rollback)
- [ ] compaction (완료 Phase → ARCHIVE)

---

## C. 빌드 하니스 (Phase 1에서 생성, 이후 전 Phase가 사용)

워크스페이스 상태 파일(article의 L2를 빌드에 적용):

| 파일 | 역할 |
|---|---|
| `PLAN.md` | 본 문서. 마스터 로드맵(불변에 가깝게 유지, 변경은 DECISIONS에 기록) |
| `SOUL.md` | 빌드 에이전트 정체성·가치·하드제약 (spec drift 방어) — Phase 1에서 작성 |
| `PROGRESS.md` | 현재 Phase·완료 항목·다음 액션·last-checked (매 Phase 갱신) |
| `DECISIONS.md` | 아키텍처 의사결정 기록(ADR) — 스택/스키마/트레이드오프 |
| `ARCHIVE.md` | compaction된 과거 진행 기록 |

> 본 플랜에서는 PLAN.md와 함께 SOUL.md·PROGRESS.md 스텁을 같이 생성해 하니스를 즉시 가동 가능 상태로 둔다.

---

## D. Phase 상세 (각 Phase = 한 번의 `다음`)

각 Phase는 **목표 / 작업 / 적용 기법 / 산출물 / 완료 기준(채점) / 게이트** 구조를 따른다.

### Phase 0 — 리서치 & 방향 확정  *(prompt.md §06)*
- **목표**: 공익 사이트 트래픽·비즈니스모델·웹사이트 매각 사례/매각가·AdSense RPM을 조사하고
  "공익+AdSense" vs "공익표방→자산화/매각" 두 트랙을 비교·권고.
- **작업**: WebSearch/WebFetch 다중 소스 수집 → 핵심 주장 adversarial 교차검증 → dual-track 비교표 →
  권고안 + 트랙별로 달라지는 설계 항목(분석 스키마·데이터 소유권·AdSense·SEO 강도) 정리.
- **적용 기법**: multi-source 리서치 + 주장 검증(maker-checker), 산출물=의사결정 입력.
- **산출물**: `docs/00_direction-report.md`.
- **완료 기준**: 두 트랙 정량 비교(트래픽·수익·매각가 레인지)와 명확한 권고가 있는가? 출처가 달려 있는가?
- **게이트**: 사용자가 트랙 확정 → `다음`.

### Phase 1 — 빌드 하니스 & 프로젝트 부트스트랩
- **목표**: 상태파일 하니스 + Next.js(App Router) + Supabase 스캐폴딩 + 툴링.
- **작업**: `SOUL.md`/`PROGRESS.md`/`DECISIONS.md` 작성; Next.js App Router 프로젝트 생성(OIPMonorepo 스타일);
  TS strict·ESLint·Prettier·Zod·환경변수 스키마(zod) ; Supabase 클라이언트·로컬 개발 설정; `.env.example`·secret 분리;
  mocking 토대(MSW 또는 자체 mock 레이어); 기본 CI(타입체크·lint).
- **적용 기법**: L2 상태파일(context rot 방어), allowed-tools/secret 분리(L4), git 초기 체크포인트.
- **산출물**: 빌드 가능한 빈 앱 + 하니스 파일 + `DECISIONS.md`(스택 확정 ADR).
- **완료 기준**: `dev` 서버 기동·타입체크·lint 통과. secret이 코드에 하드코딩되지 않음.
- **게이트**: `다음`.

### Phase 2 — 데이터 모델 & Supabase 스키마 + RLS
- **목표**: 전 기능의 데이터 토대 + 익명 식별 + 어뷰즈 방어 + 자산화용 분석 스키마.
- **작업**: 테이블 설계 — `marathons`, `disruptions`(불편 시간 입력), `comments`(무기명/좋아요),
  `reports`(앱 불편신고), `device_identity`(IP+UA+fingerprint 해시·세션), `ai_collection_log`(수집 ledger),
  `events`(분석/자산화용 append-only). RLS 정책; 기기 휴리스틱 1인 1회(완전차단 아님);
  과도입력 필터(서버측 Zod + 임계값, 예: 단일 입력 상한·합산 상한); migration·seed/mock.
- **적용 기법**: idempotency(중복 입력 안전), append-only audit, 최소권한 RLS, content_hash 컬럼(수집 변경감지).
- **산출물**: migration SQL + 타입 생성 + seed.
- **완료 기준**: 모든 페이지 요구 데이터를 표현 가능한가? 과도입력/중복이 서버에서 걸러지는가? RLS가 쓰기를 제약하는가?
- **게이트**: `다음`.

### Phase 3 — 공유 레이아웃 & 마라톤 선택 컨텍스트  *(prompt.md §02)*
- **목표**: 반응형 표준 레이아웃 + 상단 3메뉴 + 마라톤 선택기(페이지2·3 공유).
- **작업**: App Router layout, 상단 네비(취지/분노해소/대응); 현재위치·현재시간 기준 최근접 마라톤 자동선택;
  웹=드롭다운, 모바일=단일 지정+모달; 선택 상태를 페이지2·3가 공유(URL param/context);
  Next metadata API로 OG/SEO 기본 메타(확산용).
- **적용 기법**: SEO/OG(여론 확산), 공유 컨텍스트 단일 출처.
- **산출물**: 레이아웃·네비·마라톤 선택 컴포넌트.
- **완료 기준**: 모바일/웹 모두에서 마라톤 선택이 동작하고 두 페이지가 같은 선택을 공유하는가? OG 메타가 렌더되는가?
- **게이트**: `다음`.

### Phase 4 — 페이지 ① 취지
- **목표**: 정제된 카피 + 여론 기반 대책 요약 + 행동 유도.
- **작업**: 심플·깔끔 카피; 여론(뉴스 댓글 등)에서 추출한 주요 대책 N개 표시(초기엔 정적 초안, Phase 7 수집과 연동 가능);
  명확한 CTA(분노해소 페이지로 유도).
- **적용 기법**: "행동 장치" 원칙(reference.md), 데이터+스토리 병치.
- **산출물**: `/` 또는 `/about` 취지 페이지.
- **완료 기준**: 문제가 한 문장으로 명확한가? CTA가 다음 행동으로 연결되는가?
- **게이트**: `다음`.

### Phase 5 — 페이지 ② 분노 해소 집계 (메인)  *(prompt.md §01-2)*
- **목표**: 불편 시간 합계를 전면에, 입력·집계·댓글·신고까지.
- **작업**: 최상단 — 불편자 리스트 + 소모시간 합계(크게)·실시간 카운터; 그 아래 즉시 입력창(시간/댓글);
  기기 휴리스틱 1인 1회; 과도입력 필터; 주최측 정보(홈피/연락처/메일); 무기명 댓글
  (상위 20개: 좋아요 top5 + 나머지 최신); 최하단 앱 불편신고(개발자 메일=secret 주입);
  AdSense 위치 placeholder(컨셉 비침습).
- **적용 기법**: idempotency·어뷰즈 방어, 실시간(Supabase realtime), 자산화용 event 적재.
- **산출물**: 분노해소 페이지 전체.
- **완료 기준**: 합계가 크게 보이고 입력→집계 반영이 정확/중복안전한가? 댓글 정렬 규칙이 맞는가? 신고가 접수되는가?
- **게이트**: `다음`.

### Phase 6 — 페이지 ③ 우회 대응  *(prompt.md §01-3)*
- **목표**: 마라톤별 간단·확실한 우회 지침.
- **작업**: 마라톤 선택 컨텍스트 공유; 위치 권한 단계적 요청; 지하철/대체버스 등 간단 지침;
  지도 API는 간단·확실할 때만 연동(아니면 위치권한 기반 텍스트 지침). 권한 수준에 따라 점증 디테일.
- **적용 기법**: graceful degradation(권한 없을 때도 동작), 점증적 향상.
- **산출물**: 대응 페이지.
- **완료 기준**: 권한 거부 시에도 유용한 지침을 주는가? 선택 마라톤에 맞는 정보인가?
- **게이트**: `다음`.

### Phase 7 — 자율 데이터 수집 에이전트 ★ (PDF 4-Layer 핵심)  *(prompt.md §03·05)*
- **목표**: 마라톤·주최·우회로 정보를 Claude API로 자율 수집→정형화→등록. 개발자는 검수만.
- **작업/아키텍처** (상세 §E):
  - **L1 Heartbeat**: Supabase Edge Function + cron(간격+지터). 마라톤 시즌 주기 수집.
  - **L2 State**: `ai_collection_log` ledger, `content_hash`로 변경 시에만 갱신(중복 회피), last-checked.
  - **L3 Orchestrator-Worker**: Lead(조사 대상 plan) → Worker(검색·정형화, Sonnet/Haiku) → 필터 → 등록.
  - **L4 Guardrails**: cost guardrail 4단(max_tokens/turns/timeout·세션 예산·일일 쿼터·이상 circuit breaker),
    dry-run(staging 테이블 등록 후 개발자 검수→승격), idempotency, LLM-as-judge 품질 채점(임계 미달 폐기),
    tool description engineering, external escalation(이상 시 일시정지·알림).
  - **dev=모킹**(Claude API mock 응답) / **prod=secret 키 주입**.
  - 개발자=유저 검수 경로(틀리면 DB 직접 수정).
- **적용 기법**: 4-Layer 전체 + model tier 분리 + subagent=filter + dry-run + LLM-as-judge.
- **산출물**: 수집 에이전트 + cron + staging/검수 흐름 + mock.
- **완료 기준**: mock으로 end-to-end(트리거→수집→정형→staging→검수→등록)가 도는가? 비용 가드·중복회피·품질채점이 작동하는가?
- **게이트**: `다음`.

### Phase 8 — 가드레일·관측성·비용·트래픽 (L4 / Tier 3-4)
- **목표**: production 신뢰성 + 트래픽 스파이크 대응 + 비용 통제.
- **작업**: 관측성 4층(logging/metrics/alerts/quality eval); execution ledger·cost attribution;
  rate limit·abuse 방어; 트래픽 스파이크 대응(edge cache/ISR, 집계 캐싱); AdSense·분석(자산화 트랙이면 강화);
  external escalation·일일 예산 알림.
- **적용 기법**: observability 4층, cost guardrail, circuit breaker.
- **산출물**: 관측/가드 구성 + 캐싱 전략.
- **완료 기준**: 스파이크 부하에서 집계가 견디는가? 비용 상한·이상감지가 작동하는가? 핵심 지표가 로깅되는가?
- **게이트**: `다음`.

### Phase 9 — 배포 & 턴키 인계
- **목표**: Vultr VPC 배포·도메인·실 API 전환·운영 인계.
- **작업**: Docker 빌드·Vultr 배포; no-marathon.kr 연결·HTTPS; dev→prod secret 주입 절차; mock→실 Claude API 전환;
  cron 가동; 운영 런북(검수·수정·일시정지 절차); 인계 문서; 최종 E2E 검수.
- **적용 기법**: Tier 4 production-grade, immutable audit, escalation 런북.
- **산출물**: 배포된 사이트 + 운영 문서.
- **완료 기준**: 실서비스에서 3페이지·입력·수집·검수가 동작하는가? 롤백·일시정지가 가능한가?
- **게이트**: 완료.

---

## E. 런타임 수집 에이전트 상세 설계 (Phase 7 확대)

```
  cron(L1) ─▶ Lead(plan: 어떤 마라톤/무엇을 조사)         ── 상태: ai_collection_log(L2)
                 │                                            content_hash 비교 → 변경시만 진행
                 ├─▶ Worker A: 마라톤 일정/장소 검색·정형     (Claude Sonnet/Haiku)
                 ├─▶ Worker B: 주최측 정보(홈피·연락처·메일)
                 └─▶ Worker C: 우회로/대중교통 지침
                 │
                 ▼
            intelligent filter → 정형 스키마(Zod 검증)
                 │
                 ▼
            LLM-as-judge 품질 채점(0~10) ── 임계 미달 → 폐기·재시도
                 │
                 ▼
            dry-run: staging 테이블 등록 ── 개발자 검수 → 승격(production)
```

- **cost guardrail 4단**: ① per-call(max_tokens·max_turns·timeout) ② per-session(예산 USD·시간)
  ③ per-day(에이전트/시스템 쿼터) ④ anomaly circuit breaker(평균 2배 초과 시 일시정지+알림, 실패율 50%↑ 시 검수요구).
- **idempotency**: 동일 마라톤·동일 content_hash면 재등록 안 함. 외부 호출은 dedup 키.
- **allowed-tools**: 검색·읽기·staging 쓰기만. production 직접 쓰기·destructive 금지(개발자 승격으로만).
- **tool description engineering**: 각 도구 자족·비중복·목적특화.
- **external escalation**: 이상(비용/실패/의심 응답) 시 자동 pause + 개발자 알림(메일/Slack).

---

## F. 리스크 & 미해결 결정 (진행 중 DECISIONS.md에 확정)

1. **방향 트랙 최종 확정** — Phase 0 리서치 후 (공익+AdSense vs 자산화/매각).
2. **호스팅 형상** — Supabase Cloud + Next.js(Vultr) 조합 vs Vultr 자체호스팅 범위. Phase 1에서 확정.
3. **지도 API 사용 여부** — Phase 6에서 "간단·확실" 판단 기준으로 결정.
4. **수집 주기/지터·시즌 한정** — Phase 7에서 마라톤 캘린더 기반 확정.
5. **실시간 vs 폴링 집계** — 트래픽·비용 기준 Phase 5/8에서 확정.

---

## Appendix — PDF(TR-2026-04) 요약

- 핵심 명제: 단순 cron+prompt(heartbeat-only)는 production에 불충분. **L1 Heartbeat·L2 State·L3 Orchestrator·L4 Guardrails**
  4층이 필요.
- 주요 위험: context rot(장문 성능저하), specification drift, runaway cost, agentic misalignment.
- 핵심 처방: 상태 외부화(파일/체크포인터), orchestrator-worker(병렬 분해 작업에 +90%, tightly-interdependent엔 부적합),
  compaction, LLM-as-judge, cost guardrail 4단, external escalation(blackmail 38.73%→1.21%).
- 구현 4-Tier: 30분 → 4시간 → 1일 → production-grade.
- 한국 맥락: harness engineering이 frontier 모델 격차(~22배)를 만든다.
