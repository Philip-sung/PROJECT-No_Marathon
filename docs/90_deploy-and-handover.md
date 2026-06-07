# no-marathon.kr — 배포 & 턴키 인계 문서 (Phase 9)

작성: 2026-06-07

> "그저 실행해서 확인하고 호스팅하면 끝"(prompt §05)을 위한 단계별 안내.
> 개발(dev)은 mock 으로 키 없이 전부 동작하고, 운영(live)은 secret 주입 + Supabase 연결로 전환한다.

---

## 0. 한눈에

- 스택: Next.js 15(App Router) · Supabase(Postgres) · Tailwind · Zod, Vultr Docker 배포.
- 3페이지: `/`(취지) · `/record`(불편 기록·집계) · `/detour`(우회 안내).
- 자율 수집 에이전트(PDF 4-Layer): Claude API 로 마라톤 정보 수집→정형→staging→개발자 검수→published.
- 모드: `NEXT_PUBLIC_APP_MODE=mock|live`. dev=mock(외부호출 0), 운영=live.

---

## 1. 사전 준비

1. 도메인: `no-marathon.kr` (DNS A 레코드를 Vultr 인스턴스 IP 로).
2. Vultr VPC + 인스턴스(Ubuntu, Docker 설치).
3. Supabase 프로젝트(무료/유료) — URL, anon key, service_role key.
4. Anthropic API key(수집 에이전트 live).
5. (선택) Slack incoming webhook, Google AdSense 게시자 ID.

---

## 2. Supabase 설정

1. Supabase 프로젝트 생성 → SQL Editor.
2. `supabase/migrations/0001_init.sql` → `0002_rls.sql` → `0003_views.sql` 순서로 실행.
   (또는 supabase CLI: `supabase db push`)
3. (선택) `supabase/seed.sql` 로 샘플 데이터 적재(운영 시 생략 가능).
4. Project Settings → API 에서 URL / anon key / service_role key 확보.

스키마 요약: marathons(staging→published) · disruptions · comments · comment_likes · reports ·
ai_collection_log(ledger) · events. 공개 읽기는 device_hash 제외 뷰(v_*_public), 쓰기는 서버 service_role.

---

## 3. 환경 변수

`.env.example` 복사 → 값 채우기. 구분:

- 빌드 타임 인라인(NEXT_PUBLIC_*, live 시 docker build-arg 로 주입):
  `NEXT_PUBLIC_APP_MODE=live`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  (선택) `NEXT_PUBLIC_ADSENSE_CLIENT`.
- 런타임 secret(서버, `.env.production`):
  `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `AGENT_TRIGGER_SECRET`, `DEVICE_HASH_SALT`,
  `REPORT_INBOX_EMAIL`, (선택) `SLACK_WEBHOOK_URL`.

> 주의: NEXT_PUBLIC_* 는 빌드 시 코드에 박힌다 → 값 변경 시 재빌드 필요. secret 은 절대 NEXT_PUBLIC_ 금지.

---

## 4. 빌드 & 실행

### 로컬(dev, mock)
```bash
npm install
cp .env.example .env.local   # 기본 mock
npm run dev
```

### 운영(Docker, live)
```bash
# 서버 secret 파일 작성
cp .env.example .env.production   # 서버 전용 값 채움(NEXT_PUBLIC_* 는 build args 로)

# live 빌드(NEXT_PUBLIC_* build-arg 주입) + 실행
NEXT_PUBLIC_APP_MODE=live \
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
docker compose up -d --build
```
헬스체크: `curl http://localhost:3000/api/health` → `{"status":"ok","mode":"live"}`.

---

## 5. Vultr + 도메인 + HTTPS (nginx)

1. 인스턴스에 코드 배포(git clone) → 위 docker compose 실행(앱은 127.0.0.1:3000).
2. nginx 리버스 프록시:
```nginx
server {
  server_name no-marathon.kr;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host;
               proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; }
}
```
   (X-Forwarded-For 전달 필수 — 기기 식별 IP 추출에 사용)
3. HTTPS: `certbot --nginx -d no-marathon.kr` (Let's Encrypt 자동 갱신).
4. DNS A 레코드 → 인스턴스 IP.

---

## 6. 수집 에이전트 cron (L1 Heartbeat)

마라톤 시즌에 주기 수집. crontab 에 등록(예: 30분 주기):
```
*/30 * * * * curl -s -XPOST -H "x-agent-secret: $AGENT_TRIGGER_SECRET" https://no-marathon.kr/api/agent/collect >> /var/log/nm-agent.log 2>&1
```
가드레일: per-call/세션/일일/이상 4단 비용 한도 + LLM-as-judge 품질 임계 + content_hash 중복 회피.
에이전트는 staging 까지만 — 게시는 사람 검수.

---

## 7. 운영 런북

### 7.1 수집 검수(개발자=유저 검수, prompt §03)
```bash
S=$AGENT_TRIGGER_SECRET
# 검수 대기 목록
curl -s -H "x-agent-secret: $S" https://no-marathon.kr/api/agent/staging
# 승격(게시) 또는 반려
curl -s -XPOST -H "x-agent-secret: $S" -H "Content-Type: application/json" \
  -d '{"id":"<staging-id>","action":"publish"}' https://no-marathon.kr/api/agent/review
```
내용이 틀리면 Supabase 대시보드(Table editor)에서 marathons 행을 직접 수정 후 status=published.

### 7.2 모니터링
- 헬스: `GET /api/health`
- 메트릭: `GET /api/agent/metrics` (x-agent-secret) — staged/pending/일일비용/이벤트수
- 로그: 컨테이너 stdout(JSON 라인). escalation 시 Slack(설정 시).

### 7.3 일시정지(escalation/이상 시)
- cron 비활성화(수집 중단): crontab 주석 처리.
- 이상 비용/실패율은 에이전트 circuit breaker 가 자동 중단 + notify.

### 7.4 mock ↔ live 전환
- `NEXT_PUBLIC_APP_MODE` 변경(재빌드) + secret 주입. mock 으로 되돌리면 외부호출 0.

---

## 8. dual-track(공익+AdSense / 자산화) 운영 메모

- AdSense: `NEXT_PUBLIC_ADSENSE_CLIENT` 설정 시 활성(미설정=placeholder). 컨셉 보존 위해 절제.
- 자산화 헤지: events 테이블 + page_view 비콘으로 트래픽 데이터 축적. GA4/Search Console 연결 권장.
- 매각/수익 트리거: 지속 트래픽(비시즌 유지) 확인 시 수익모델·매각 검토(docs/00_direction-report.md).

---

## 9. 최종 인계 체크리스트

- [ ] Supabase 마이그레이션 0001~0003 적용
- [ ] .env.production secret 채움(서버), NEXT_PUBLIC_* build-arg 준비
- [ ] `docker compose up -d --build` (live) → /api/health mode=live
- [ ] 도메인 DNS + nginx + certbot HTTPS
- [ ] X-Forwarded-For 전달 확인(기기 식별)
- [ ] 수집 cron 등록 + 1회 수동 트리거 → staging 확인 → 검수 승격
- [ ] 3페이지 동작(취지/기록/우회), 입력→집계, 댓글/좋아요/신고
- [ ] (선택) SLACK_WEBHOOK_URL, AdSense, GA4 연결

---

## 10. 알려진 한계 / 후속

- 실시간 집계는 fetch 갱신(즉시 폴링). 필요 시 Supabase Realtime 구독으로 강화.
- rate limit/수집 ledger 인메모리(단일 인스턴스 기준). 다중 인스턴스 시 Redis/DB 로 이전.
- 신고/escalation 메일: 현재 Slack/log. SMTP 발송 필요 시 REPORT_INBOX_EMAIL + 메일러 연동.
- live 경로(Supabase/Anthropic)는 키 연결 후 1회 E2E 재검증 권장.
