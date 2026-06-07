# no-marathon.kr

서울 주말 마라톤 교통통제로 인한 시민 불편을 기록·집계하고, 대책을 요구하며, 우회 정보를 제공하는 공익 웹사이트.

---

## 🚀 턴키 셋업 — 내가 해야 할 일 (이 순서대로)

> 한 번만 세팅하면, 그 뒤로는 **하루 1회 자동 수집 → `/admin`에서 검토·게시**만 하면 됩니다.
> ⚠️ 중요: **앱 배포만으로는 수집이 안 됩니다. 6번 cron 등록까지 해야 자동으로 돕니다.**
> 수집분은 **품질 게이트(LLM-as-judge)를 통과하면 즉시 게시**됩니다(autoPublish). 틀린 정보는 `/admin`에서 수정·보관하세요.

### 0. 준비물 (계정·키)
- [ ] Supabase 프로젝트
- [ ] Anthropic API 키 (`ANTHROPIC_API_KEY`)
- [ ] 호스팅(Vultr VPC 등) + 도메인(no-marathon.kr)
- [ ] 임의의 긴 문자열 2개 직접 정하기: `AGENT_TRIGGER_SECRET`(수집 트리거용), `ADMIN_PASSCODE`(관리자 번호)

### 1. (선택) 로컬에서 먼저 눈으로 확인 — 키 없이
```bash
npm install
cp .env.example .env.local      # 기본 mock
npm run dev                      # http://localhost:3000 , /admin 도 확인
```

### 2. Supabase 스키마 적용
Supabase 대시보드 → SQL Editor에 아래 파일 내용을 **순서대로** 붙여넣고 실행:
`supabase/migrations/0001_init.sql` → `0002_rls.sql` → `0003_views.sql` → `0004_add_region.sql` → `0005_control_zone_and_comment_channel.sql`
→ Project Settings → API 에서 **URL / anon key / service_role key** 복사.

### 3. 환경변수 채우기
서버 secret(`.env.production` 등):
```
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
AGENT_TRIGGER_SECRET=내가_정한_긴_문자열
ADMIN_PASSCODE=내가_정한_관리자_번호
DEVICE_HASH_SALT=아무거나_긴_문자열
REPORT_INBOX_EMAIL=내메일@example.com        # 앱 불편신고 수신(선택)
# 수집 리포트 메일(선택) — send-naver-mail 스킬과 동일한 네이버 앱 비밀번호
NAVER_MAIL_USER=내아이디@naver.com
NAVER_MAIL_APP_PASSWORD=네이버_SMTP_앱비밀번호
COLLECTION_REPORT_EMAIL=리포트_받을_주소@naver.com   # 미설정 시 NAVER_MAIL_USER 로 발송
```
빌드타임(공개) 값은 **빌드 시 주입**(아래 4번 build-arg):
`NEXT_PUBLIC_APP_MODE=live`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. 빌드 & 실행 (Docker)
```bash
NEXT_PUBLIC_APP_MODE=live \
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
docker compose up -d --build
curl http://localhost:3000/api/health        # {"mode":"live"} 확인
```

### 5. 도메인 + HTTPS
nginx 리버스 프록시(`proxy_pass 127.0.0.1:3000`, `X-Forwarded-For` 전달) + `certbot --nginx -d no-marathon.kr` + DNS A레코드.
(상세 명령: [docs/90_deploy-and-handover.md](docs/90_deploy-and-handover.md))

### 6. ⏰ 자동 수집 cron 등록 (이걸 해야 자동으로 돕니다)
서버에서 `crontab -e` 후 추가 (매일 04:00):
```
0 4 * * * curl -s -XPOST -H "x-agent-secret: 내가_정한_AGENT_TRIGGER_SECRET" https://no-marathon.kr/api/agent/collect >> /var/log/nm-agent.log 2>&1
```

### 7. 첫 수집 1회 수동 확인 (live 첫 동작 점검)
```
curl -XPOST -H "x-agent-secret: 내가_정한_secret" https://no-marathon.kr/api/agent/collect
```
→ 품질 게이트 통과분은 **즉시 게시**되므로, `https://no-marathon.kr` 메인/우회 페이지에 **대회가 바로 보이면 성공.** (수집 리포트 메일도 도착)

---

## ✅ 세팅 끝난 뒤, 내가 평소에 하는 일 (거의 없음)
1. 매일 새벽 cron 이 수집 → **품질 통과분 자동 게시** → 결과를 **메일로 받음**. (평소엔 안 봐도 됨)
2. 메일/사이트에서 **틀린 정보**가 보이면 그때만 `https://no-marathon.kr/admin` 접속 → 수정 또는 보관.
3. 끝.

> 잘못된 정보가 보이면 `/admin`에서 직접 고치거나, Supabase 대시보드에서 `marathons` 테이블을 직접 수정해도 됩니다.

---

## 문서

- 구현 로드맵: [PLAN.md](PLAN.md) — Phase 0~9 (`다음` 게이트 방식)
- 진행 상태: [PROGRESS.md](PROGRESS.md)
- 의사결정: [DECISIONS.md](DECISIONS.md)
- 빌드 에이전트 기준: [SOUL.md](SOUL.md)
- 방향 리서치: [docs/00_direction-report.md](docs/00_direction-report.md)
- 클러스터 배포(GHCR+k8s): [k8s/README.md](k8s/README.md) — Obtopus/OIP 동일 클러스터, 값 취득처·등록·배포 절차

## 스택

Next.js 15 (App Router) · React 19 · TypeScript(strict) · Supabase(Postgres) · Tailwind · Zod

## 로컬 개발

```bash
npm install
cp .env.example .env.local   # 기본 mock 모드 — secret 없이 동작
npm run dev                  # http://localhost:3000
```

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run typecheck` | 타입 검사 |
| `npm run lint` | ESLint |
| `npm run format` | Prettier 포맷 |

## 실행 모드

- `NEXT_PUBLIC_APP_MODE=mock` (기본): 외부 의존(Supabase/Claude) 없이 동작. 개발·검수용.
- `NEXT_PUBLIC_APP_MODE=live`: 실제 Supabase/Claude 연동. secret 주입 필요.

### 모킹 데이터셋 (`MOCK_DATASET`, mock 모드 전용)
- `file`(권장) / `default`(= file) — **`mock-data/` 폴더의 JSON**(`marathons.json`/`disruptions.json`/`comments.json`)을
  읽어 DB 로드와 **동일한 경로(store)** 로 주입. 누락 필드는 자동 기본값. 폴더는 `MOCK_DATA_DIR` 로 변경 가능.
- `empty` — 빈 상태.
- 가짜 샘플/대규모 더미 데이터는 모두 제거됨 — `mock-data/` 에는 실제 수집·정제한 마라톤만 둔다.
  (불편기록·댓글은 방문자 생성분이라 기본 빈 배열.)

## 수집 에이전트 (PDF 4-Layer)

마라톤/주최/우회 정보를 Claude API 로 수집·정형화하고, 품질 게이트 통과 시 즉시 published 로 게시한다(autoPublish; 틀린 정보는 /admin 에서 사후 수정·보관).

| 동작 | 호출 |
|---|---|
| 수집 1회(L1 트리거) | `POST /api/agent/collect` (헤더 `x-agent-secret`) |
| 검수 대기 목록 | `GET /api/agent/staging` |
| 승격/반려 | `POST /api/agent/review` `{ "id", "action": "publish"|"reject" }` |

live 에서는 worker 가 **web_search(Sonnet)** 로 실제 웹을 검색해 정형화한다. cron 은 **하루 1회 권장**:
`0 4 * * *` 뒤에 `curl -XPOST -H "x-agent-secret: $AGENT_TRIGGER_SECRET" https://no-marathon.kr/api/agent/collect`

### 권위 참조 출처(완전성 검증 앵커)

worker 는 매 수집 시 아래 **1차 출처를 반드시 먼저 조회**하고, 후보를 서울시 월별 안내에 **대조**해
누락을 점검한 뒤, 그 위에 **추가 web_search 로 교차검증**한다(앵커 조회로 끝내지 않음). 정의: SSOT
[src/lib/agent/sources.ts](src/lib/agent/sources.ts).

- **서울시 월별 「광역 교통통제(예정) 마라톤 안내」** ([news.seoul.go.kr/culture](https://news.seoul.go.kr/culture)) — 그 달 통제 마라톤 전수 목록(완전성 황금 기준).
- **서울경찰청 교통정보센터(SPATIC)** ([spatic.go.kr](https://www.spatic.go.kr)) — 통제 집행 주체, 구간·시간 원천.
- **서울 TOPIS** ([topis.seoul.go.kr](https://topis.seoul.go.kr)) — 통제 지도/집회·행사 목록/공공데이터 API.
- 보강(애그리게이터): 마라톤GO, marathon.pe.kr.

### 수집 리포트 메일(자동)

수집이 끝나면(수동 트리거/cron 무관) **내용·토큰 소모량·비용(USD)** 을 네이버 메일로 발송한다.
`NAVER_MAIL_USER`/`NAVER_MAIL_APP_PASSWORD` 가 있으면 발송, 없으면 조용히 생략(수집은 정상 진행).
구현 [src/lib/agent/mail.ts](src/lib/agent/mail.ts).

가드레일: per-call max_tokens · per-session 예산 · per-day 쿼터 · 실패율 circuit breaker · LLM-as-judge 품질 임계 · content_hash 중복 회피 · 검색 미확인 값 null. 품질 게이트 통과분은 즉시 게시(`autoPublish=true`; false 로 두면 staging 수동 검수).

## 간이 백오피스 (정보 관리)

`/admin` 접속 → **관리자 번호(ADMIN_PASSCODE)** 입력 → 전체 마라톤(staging/published/archived)을 확인하고 필드·우회정보(JSON)·통제구간(JSON)을 직접 수정, 게시/보관 처리. (mock/dev 에서는 번호 미설정 시 아무 값이나 입력)
