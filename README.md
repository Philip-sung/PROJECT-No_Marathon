# no-marathon.kr

서울 주말 마라톤 교통통제로 인한 시민 불편을 기록·집계하고, 대책을 요구하며, 우회 정보를 제공하는 공익 웹사이트.

---

## 🚀 턴키 셋업 — 내가 해야 할 일 (이 순서대로)

> 한 번만 세팅하면, 그 뒤로는 **하루 1회 자동 수집 → `/admin`에서 검토·게시**만 하면 됩니다.
> ⚠️ 중요: **앱 배포만으로는 수집이 안 됩니다. 6번 cron 등록까지 해야 자동으로 돕니다.**
> 그리고 수집은 staging까지만 — 사용자에게 보이려면 **`/admin`에서 "게시"를 눌러야** 합니다(틀린 정보 방지용 안전장치).

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
→ `https://no-marathon.kr/admin` 접속 → 관리자 번호 입력 → **staging 항목이 보이면 성공.**

---

## ✅ 세팅 끝난 뒤, 내가 평소에 하는 일 (이게 전부)
1. `https://no-marathon.kr/admin` 접속 → 관리자 번호 입력
2. **검수 대기(staging)** 항목 확인 → 틀린 내용 있으면 수정 → **"게시"** 클릭
3. 끝. (이미 게시된 정보가 바뀌었으면 거기서 수정하면 됨)

> 잘못된 정보가 보이면 `/admin`에서 직접 고치거나, Supabase 대시보드에서 `marathons` 테이블을 직접 수정해도 됩니다.

---

## 문서

- 구현 로드맵: [PLAN.md](PLAN.md) — Phase 0~9 (`다음` 게이트 방식)
- 진행 상태: [PROGRESS.md](PROGRESS.md)
- 의사결정: [DECISIONS.md](DECISIONS.md)
- 빌드 에이전트 기준: [SOUL.md](SOUL.md)
- 방향 리서치: [docs/00_direction-report.md](docs/00_direction-report.md)

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
- `default` 기본 샘플 · `heavy` 대규모(480건/80댓글) · `empty` 빈 상태
- `file` — **`mock-data/` 폴더의 JSON**(`marathons.json`/`disruptions.json`/`comments.json`)을 읽어
  DB 로드와 **동일한 경로(store)** 로 주입. 누락 필드는 자동 기본값. 폴더는 `MOCK_DATA_DIR` 로 변경 가능.
  예) `MOCK_DATASET=file npm run dev` → 폴더 내용이 화면/`/admin`에 그대로 반영.

## 수집 에이전트 (PDF 4-Layer)

마라톤/주최/우회 정보를 Claude API 로 수집·정형화하여 staging 에 적재하고, 개발자 검수 후 published 로 승격한다.

| 동작 | 호출 |
|---|---|
| 수집 1회(L1 트리거) | `POST /api/agent/collect` (헤더 `x-agent-secret`) |
| 검수 대기 목록 | `GET /api/agent/staging` |
| 승격/반려 | `POST /api/agent/review` `{ "id", "action": "publish"|"reject" }` |

live 에서는 worker 가 **web_search(Sonnet)** 로 실제 웹을 검색해 정형화한다. cron 은 **하루 1회 권장**:
`0 4 * * *` 뒤에 `curl -XPOST -H "x-agent-secret: $AGENT_TRIGGER_SECRET" https://no-marathon.kr/api/agent/collect`

가드레일: per-call max_tokens · per-session 예산 · per-day 쿼터 · 실패율 circuit breaker · LLM-as-judge 품질 임계 · content_hash 중복 회피 · 검색 미확인 값 null. 에이전트는 staging 까지만(자동 게시 금지).

## 간이 백오피스 (정보 관리)

`/admin` 접속 → **관리자 번호(ADMIN_PASSCODE)** 입력 → 전체 마라톤(staging/published/archived)을 확인하고 필드·우회정보(JSON)·통제구간(JSON)을 직접 수정, 게시/보관 처리. (mock/dev 에서는 번호 미설정 시 아무 값이나 입력)
