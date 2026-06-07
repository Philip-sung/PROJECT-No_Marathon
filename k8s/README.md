# 클러스터 배포 (GHCR + Kubernetes)

PROJECT-Obtopus / PROJECT-OIPMonorepo 와 **동일한 쿠버네티스 클러스터**에 배포하는 절차다.
(Vultr 단일 인스턴스 / Docker compose 배포는 루트 [README.md](../README.md) 의 "턴키 셋업" 참조 — 이 문서는 클러스터용.)

배포 흐름:

```
git push (main) → GitHub Actions 빌드 → ghcr.io/philip-sung/no-marathon-image → 클러스터 pull → 롤아웃
```

키는 **두 종류**이고 주입 시점이 다르다 — 이게 핵심이다.

| 종류 | 예 | 주입 시점 | 어디에 넣나 |
|---|---|---|---|
| 빌드타임(공개) `NEXT_PUBLIC_*` | SUPABASE_URL, ANON_KEY | `next build` 시 번들에 인라인 | **GitHub 레포 Secrets/Variables** (1단계) |
| 런타임(서버 전용) | SERVICE_ROLE_KEY, ANTHROPIC_API_KEY 등 | 컨테이너 실행 시 env | **클러스터 Secret `no-marathon-env`** (2단계) |

> `NEXT_PUBLIC_*` 를 `.env.production` 에만 넣으면 동작하지 않는다 — 빌드는 GitHub Actions(클라우드)에서 일어나고 거기엔 그 파일이 없기 때문. 반드시 레포 Secrets 에도 넣어야 한다.

---

## 1단계 — GitHub 레포 Secrets (빌드용)

레포 → **Settings → Secrets and variables → Actions**

**[ Secrets 탭 ]** → New repository secret:

| 키 | 어디서 얻나 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | [supabase.com/dashboard](https://supabase.com/dashboard) → 프로젝트 → Settings → API → "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 같은 화면 → "Project API keys" → **anon / public** |

**[ Variables 탭 ]** (선택):

| 키 | 값 |
|---|---|
| `NEXT_PUBLIC_APP_MODE` | `live` (미설정 시 워크플로가 자동으로 live) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | 애드센스 게시자 ID — **미도입이면 생략** (생략 시 광고 슬롯은 자동 숨김) |

---

## 2단계 — 런타임 Secret `no-marathon-env` (서버 전용 키)

먼저 `.env.production` 에 아래 값을 채운다(이 파일은 gitignore — 커밋 금지). 취득처:

| 키 | 어디서 얻나 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` | 위 1단계와 동일 (Supabase → Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → "Project API keys" → **service_role** (⚠️ 비공개, 클라 노출 금지) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → Settings → API Keys → Create Key |
| `AGENT_TRIGGER_SECRET` | **직접 생성**하는 임의 문자열. `openssl rand -hex 32` |
| `DEVICE_HASH_SALT` | **직접 생성** 임의 문자열. `openssl rand -hex 32` |
| `ADMIN_PASSCODE` | **직접 정하는** /admin 백오피스 접속 비번(임의의 긴 문자열) |
| `NAVER_MAIL_USER` | 본인 네이버 메일 주소 |
| `NAVER_MAIL_APP_PASSWORD` | 네이버 메일 → 환경설정 → POP3/IMAP → **메일 앱 비밀번호 발급**(로그인 비번 아님) |
| `COLLECTION_REPORT_EMAIL` | 수집 리포트 받을 주소(미설정 시 NAVER_MAIL_USER 로) |

채운 뒤 Secret 생성:

```bash
kubectl create secret generic no-marathon-env --from-env-file=.env.production
```

값 변경 시 교체:

```bash
kubectl create secret generic no-marathon-env \
  --from-env-file=.env.production --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deployment/no-marathon-deployment
```

---

## 3단계 — GHCR pull secret (최초 1회만)

Obtopus 가 같은 네임스페이스(`philip-sung`)를 쓰므로 이미 있으면 **그대로 재사용**된다. 먼저 확인:

```bash
kubectl get secret ghcr-cred-philip-sung
```

- 나오면 → 건너뛴다.
- 없으면(NotFound) → PAT 발급 후 생성. `<PAT>` 는 [github.com/settings/tokens](https://github.com/settings/tokens) 에서
  Generate new token (classic) → **`read:packages`** 권한 체크.

```bash
kubectl create secret docker-registry ghcr-cred-philip-sung \
  --docker-server=ghcr.io --docker-username=philip-sung \
  --docker-password=<PAT> --docker-email=spinnavor@naver.com
```

> GHCR 패키지(no-marathon-image)를 **public** 으로 두면 pull secret 없이도 당겨온다(이 단계 생략 가능).
> 이미지엔 서버 secret 이 안 들어가므로(런타임 주입 + `.dockerignore` 로 `.env.*` 차단) public 이어도 안전하다.

---

## 4단계 — 배포

```bash
git push                                   # main 푸시 = GHCR 이미지 자동 빌드 시작
# GitHub Actions 탭에서 빌드 초록불 확인 후:
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl rollout status deployment/no-marathon-deployment
```

서비스는 ClusterIP(`no-marathon-service`, port 80 → 컨테이너 3000)다.

### 외부 노출(도메인 + HTTPS) — 2단(호스트 nginx → Ingress)

이 클러스터(k3s)의 TLS 구조는 다음과 같다(obtopus/oip 와 동일):

```
인터넷 → 호스트 nginx :443 (Let's Encrypt/certbot 종단)
       → http://127.0.0.1:32527 (ingress-nginx NodePort, Host 헤더 보존)
       → ingress-nginx 가 host 로 라우팅 → no-marathon-service → 파드
```

cert-manager 는 **없다**. TLS 는 노드의 **호스트 nginx + certbot** 이 도메인별로 처리한다
(`/etc/nginx/conf.d/<도메인>-proxy.conf`, certbot 이 자동 편집). 따라서 클러스터 쪽 Ingress 엔
`tls:` 블록도 cert-manager 어노테이션도 두지 않는다 — 넣으면 ingress-nginx 가 HTTP 를 308 로
HTTPS 리다이렉트해 루프가 난다.

**① 클러스터 Ingress** (SSOT: PROJECT-ClusterInfra `ingress/NoMarathonIngressResource.yaml`, host → `no-marathon-service:80`):

```bash
kubectl apply -f ingress/NoMarathonIngressResource.yaml
```

**② 호스트 nginx + Let's Encrypt** (노드에서, obtopus-proxy.conf 패턴 복제):

```bash
sudo tee /etc/nginx/conf.d/no-marathon-proxy.conf >/dev/null <<'EOF'
server {
    server_name no-marathon.kr;
    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://127.0.0.1:32527;
    }
    listen 80;
}
EOF
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d no-marathon.kr      # 443 ssl + 인증서 + 80→443 리다이렉트 자동 삽입
sudo nginx -t && sudo systemctl reload nginx
```

선행: DNS A 레코드 `no-marathon.kr → 노드 공인 IP`(현재 158.247.222.158). 검증:
`curl -sI https://no-marathon.kr/api/health` → `HTTP/1.1 200`.

> NodePort(32527)는 환경에 따라 다르다 — `kubectl get svc -n ingress-nginx` 의 `80:<포트>` 확인.
> Next.js SSR 이라 Carrsh/Obtopus(SPA)와 달리 Ingress 에 `rewrite-target` 을 넣지 않는다 — 넣으면 `/api/*`·`/admin` 경로가 `/` 로 재작성돼 깨진다.

cron 자동 수집은 앱 배포와 별개다 — 루트 [README.md](../README.md) 6번 참조.

---

## 갱신 / 롤백

```bash
# main 푸시 → 이미지 자동 빌드. 새 이미지 강제 반영:
kubectl rollout restart deployment/no-marathon-deployment

# 상태 / 로그
kubectl rollout status deployment/no-marathon-deployment
kubectl logs -l app=no-marathon-pod -f

# 특정 커밋으로 롤백(불변 태그)
kubectl set image deployment/no-marathon-deployment \
  no-marathon=ghcr.io/philip-sung/no-marathon-image:<sha>
```

---

## 레포 public 전환 시 주의

소스/이미지에 실키는 없다(검증 완료: `.env.production` 미커밋, 하드코딩 키 없음). public 전환해도 노출될 비밀은 없다. 단:

1. **`.env.production` 절대 커밋 금지** (이미 gitignore — 그대로 유지).
2. **Supabase RLS(Row Level Security) 반드시 활성화.** anon key + 테이블 구조가 공개되므로, 방어선은 오직 RLS 정책이다. 모든 테이블 RLS on + 정책 점검. (`SUPABASE_SERVICE_ROLE_KEY` 는 번들·이미지에 없어 안전.)
3. GHCR 이미지도 public 으로 두면 pull secret 불필요(3단계 생략).
