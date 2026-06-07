# 클러스터 배포 런북 (GHCR + Kubernetes)

no-marathon.kr 을 **PROJECT-Obtopus / PROJECT-OIPMonorepo 와 동일한 k3s 클러스터**에 배포·운영하는
모든 절차와, 구축 중 확인한 환경 사실·함정을 한곳에 모은 문서다.
(Vultr 단일 인스턴스 / Docker compose 배포는 루트 [README.md](../README.md) "턴키 셋업" 참조 — 이 문서는 클러스터용.)

---

## 0. 아키텍처 & 환경 사실

```
git push (main)
   → GitHub Actions(build-push.yml) 가 Docker 빌드
   → ghcr.io/philip-sung/no-marathon-image:{latest,edge,<sha>} 푸시
   → (VM에서) kubectl 로 클러스터에 적용 → 파드가 :latest pull

[ 외부 트래픽 ]
인터넷(443, HTTPS)
   → 호스트 nginx :443  (Let's Encrypt/certbot 가 TLS 종단)        ← /etc/nginx/conf.d/<도메인>-proxy.conf
   → http://127.0.0.1:32527  (ingress-nginx NodePort, Host 헤더 보존)
   → ingress-nginx 가 host(no-marathon.kr) 로 라우팅
   → no-marathon-service (ClusterIP 80)
   → 파드 (containerPort 3000, Next.js standalone)
```

현재 환경(확인된 값 — 환경 바뀌면 갱신):

| 항목 | 값 |
|---|---|
| 클러스터 | k3s (노드 호스트명 `khrsh`) |
| 노드 공인 IP | `158.247.222.158` (DNS A 레코드 `no-marathon.kr @` 가 여기를 가리킴) |
| 인그레스 컨트롤러 | ingress-nginx, **NodePort** (`80:32527`, `443:30471`) — `kubectl get svc -n ingress-nginx` 로 확인 |
| 이미지 | `ghcr.io/philip-sung/no-marathon-image` |
| GHCR pull secret | `ghcr-cred-philip-sung` (Obtopus 와 동일 네임스페이스라 재사용) |
| 런타임 secret | `no-marathon-env` (서버 전용 키) |
| TLS | **호스트 nginx + certbot(Let's Encrypt)**. cert-manager·Cloudflare **없음** |
| 자동 적용(GitOps) | **없음**. manifest 는 사람이 `kubectl apply` (Actions 는 이미지 빌드까지만) |

### 두 레포 역할 분담

| 파일/자원 | 사는 레포 | 비고 |
|---|---|---|
| `Dockerfile`, `docker-compose.yml` | **No-Marathon** | 이미지 정의 |
| `.github/workflows/build-push.yml` | **No-Marathon** | GHCR 빌드·푸시 |
| `k8s/deployment.yaml`, `k8s/service.yaml` | **No-Marathon** | 앱 Deployment/Service (Obtopus 도 자기 레포에 둠) |
| `ingress/NoMarathonIngressResource.yaml` | **PROJECT-ClusterInfra** | 인그레스만 인프라 SSOT 레포에 둠 |
| `/etc/nginx/conf.d/no-marathon-proxy.conf` | **어느 레포에도 없음** | 호스트에만 존재, certbot 관리 (기존 도메인들과 동일 관행) |

### 키는 두 종류 — 주입 시점이 다르다 (가장 흔한 함정)

| 종류 | 예 | 주입 시점 | 어디에 넣나 |
|---|---|---|---|
| 빌드타임(공개) `NEXT_PUBLIC_*` | SUPABASE_URL, ANON_KEY | `next build` 시 번들에 인라인 | **GitHub 레포 Secrets/Variables** |
| 런타임(서버 전용) | SERVICE_ROLE_KEY, ANTHROPIC_API_KEY 등 | 컨테이너 실행 시 env | **클러스터 Secret `no-marathon-env`** |

> `NEXT_PUBLIC_*` 를 `.env.production` 에만 넣으면 안 된다 — 빌드는 GitHub Actions(클라우드)에서 일어나고 거기엔 그 파일이 없다. 반드시 레포 Secrets 에도 넣어야 번들에 박힌다.

---

## A. 최초 배포 (one-time setup)

### A-1. GitHub 레포 Secrets (빌드용)

레포 → **Settings → Secrets and variables → Actions**

**[ Secrets 탭 ]**:

| 키 | 어디서 얻나 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | [supabase.com/dashboard](https://supabase.com/dashboard) → 프로젝트 → Settings → API → "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 같은 화면 → "Project API keys" → **anon / public** |

**[ Variables 탭 ]** (선택):

| 키 | 값 |
|---|---|
| `NEXT_PUBLIC_APP_MODE` | `live` (미설정 시 워크플로가 자동으로 live) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | 애드센스 게시자 ID — **미도입이면 생략** (생략 시 광고 슬롯 자동 숨김) |

### A-2. 런타임 Secret `no-marathon-env` (VM에서)

`.env.production` 에 아래 값을 채운다(이 파일은 gitignore — 커밋 금지, `git pull` 로도 안 옴 → VM에서 직접 작성). 취득처:

| 키 | 어디서 얻나 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` | A-1 과 동일 (Supabase → Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → "Project API keys" → **service_role** (⚠️ 비공개, 클라 노출 금지) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → Settings → API Keys → Create Key |
| `AGENT_TRIGGER_SECRET` | **직접 생성** 임의 문자열. `openssl rand -hex 32` |
| `DEVICE_HASH_SALT` | **직접 생성** 임의 문자열. `openssl rand -hex 32` |
| `ADMIN_PASSCODE` | **직접 정하는** /admin 백오피스 접속 비번(임의의 긴 문자열) |
| `NAVER_MAIL_USER` | 본인 네이버 메일 주소 |
| `NAVER_MAIL_APP_PASSWORD` | 네이버 메일 → 환경설정 → POP3/IMAP → **메일 앱 비밀번호 발급**(로그인 비번 아님) |
| `COLLECTION_REPORT_EMAIL` | 수집 리포트 받을 주소(미설정 시 NAVER_MAIL_USER 로) |

```bash
cd ~/PROJECT-No_Marathon
nano .env.production                      # 위 키 채우기
kubectl create secret generic no-marathon-env --from-env-file=.env.production
```

### A-3. GHCR pull secret (이미 있으면 생략)

```bash
kubectl get secret ghcr-cred-philip-sung
```

- 나오면(Obtopus 가 이미 만듦) → 건너뛴다.
- 없으면(NotFound) → `read:packages` 권한 PAT([github.com/settings/tokens](https://github.com/settings/tokens) → classic) 로 생성:

```bash
kubectl create secret docker-registry ghcr-cred-philip-sung \
  --docker-server=ghcr.io --docker-username=philip-sung \
  --docker-password=<PAT> --docker-email=spinnavor@naver.com
```

### A-4. DNS

`no-marathon.kr` A 레코드(`@`) → 노드 공인 IP(`158.247.222.158`). TTL 짧게(예 180).
이게 있어야 A-7 의 certbot HTTP-01 챌린지가 통과한다.

### A-5. 앱 배포 (No-Marathon 레포, VM에서)

GitHub Actions 빌드가 초록불인지 먼저 확인한 뒤:

```bash
cd ~/PROJECT-No_Marathon
git pull
npm run kube-deploy:all
#   = kube-apply  : kubectl apply -f k8s/deployment.yaml + service.yaml
#   + kube-rollout: kubectl rollout restart + status   (최신 :latest 재pull)
kubectl get pods -l app=no-marathon-pod   # Running 1/1 확인
```

### A-6. 클러스터 Ingress (ClusterInfra 레포, VM에서)

```bash
cd ~/PROJECT-ClusterInfra
git pull
kubectl apply -f ingress/NoMarathonIngressResource.yaml
```

> 이 Ingress 엔 **`tls:` 블록도 cert-manager 어노테이션도 없다.** 넣으면 ingress-nginx 가
> 평문 HTTP 를 308 로 HTTPS 리다이렉트해 루프가 난다(아래 트러블슈팅 참조). TLS 는 A-7 의 호스트 nginx 가 담당.

### A-7. 호스트 nginx + Let's Encrypt (HTTPS, VM에서)

obtopus-proxy.conf 와 동일 패턴. 우선 80 만 만들고 certbot 이 443 을 자동 추가한다:

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
        proxy_pass http://127.0.0.1:32527;     # ingress-nginx HTTP NodePort
    }
    listen 80;
}
EOF
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d no-marathon.kr        # 443 ssl + 인증서 + 80→443 리다이렉트 자동 삽입
sudo nginx -t && sudo systemctl reload nginx
```

### A-8. 검증

```bash
# 클러스터 내부 경로 (308 아니라 앱 응답이 나와야 함)
curl -s -H "Host: no-marathon.kr" http://localhost:32527/api/health   # {"status":"ok","mode":"live",...}
# 외부 HTTPS
curl -sI https://no-marathon.kr/api/health                            # HTTP/1.1 200
```

`mode:"live"` 면 Supabase 연동까지 정상. `mock` 이면 빌드 시 `NEXT_PUBLIC_*` 주입을 확인(A-1).

### A-9. 자동 수집 cron (앱 배포와 별개)

루트 [README.md](../README.md) 6번 참조. 안 하면 자동 수집이 돌지 않는다.

---

## B. 재배포 (routine — 코드 바꾼 뒤)

```bash
# 1) 코드 push (로컬) → GitHub Actions 가 :latest 재빌드. Actions 초록불 대기.
# 2) VM에서:
cd ~/PROJECT-No_Marathon && git pull
npm run kube-deploy:all          # rollout restart 가 새 :latest 를 당겨옴
```

Ingress·호스트 nginx·secret 은 바뀔 때만 다시 만지면 된다(평소 재배포엔 불필요).

---

## 갱신 / 롤백 / 로그

```bash
# 새 이미지 강제 반영
kubectl rollout restart deployment/no-marathon-deployment
kubectl rollout status  deployment/no-marathon-deployment

# 로그
kubectl logs -l app=no-marathon-pod -f

# 특정 커밋으로 롤백(불변 sha 태그)
kubectl set image deployment/no-marathon-deployment \
  no-marathon=ghcr.io/philip-sung/no-marathon-image:<sha>

# 런타임 secret 변경 후 반영
kubectl create secret generic no-marathon-env \
  --from-env-file=.env.production --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deployment/no-marathon-deployment
```

---

## 트러블슈팅 (구축 중 실제로 겪은 것)

**① `curl` 이 `308 Permanent Redirect (nginx)` 를 뱉음**
클러스터 Ingress 에 `tls:` 블록이 있으면 ingress-nginx 가 평문 HTTP 를 HTTPS 로 강제 리다이렉트한다.
이 클러스터는 TLS 를 호스트 nginx 가 종단하므로 Ingress 에 tls 를 두면 안 된다 → `tls:` 제거 후 재적용.

**② GitHub Actions/Docker 의 `npm ci` 가 `EUSAGE ... Missing: @emnapi/* from lock file` 로 실패**
`@unrs/resolver-binding-wasm32-wasi`(eslint resolver wasm fallback)의 중첩 optional 의존이
**Windows 에서 생성한 lockfile 에는 누락**된다(리눅스 `npm ci` 가 요구). 해결: `package-lock.json` 에
`node_modules/@emnapi/core`·`@emnapi/runtime` 레코드를 추가(커밋 `bbabc16` 참고). 근본 회피는 lockfile 을 리눅스에서 생성.

**③ HTTPS 인증서가 발급 안 됨 / certbot 실패**
DNS A 레코드가 노드 IP(158.247.222.158)를 안 가리키거나, 80 포트가 인터넷에서 막힘.
DNS 전파 확인 후 재시도. (80/443 은 기존 도메인들이 쓰고 있어 보통 이미 열려 있음.)

**④ `kubectl get certificate` → "doesn't have a resource type"**
정상이다. 이 클러스터엔 cert-manager 가 없다(Certificate/ClusterIssuer CRD 없음). TLS 는 호스트 nginx+certbot.

**⑤ NodePort 번호가 문서와 다름**
환경마다 다르다. `kubectl get svc -n ingress-nginx` 의 `80:<포트>` 를 확인해 nginx conf 의 `proxy_pass` 포트를 맞춘다.

**⑥ 광고 자리에 빈 점선 박스가 보임 (과거)**
`NEXT_PUBLIC_ADSENSE_CLIENT` 미설정 시 `AdSlot` 이 placeholder 대신 null 을 렌더하도록 수정됨(커밋 `34ddb32`).
애드센스 도입 시 그 변수만 넣으면 자동 표시.

**⑦ Next.js SSR 인데 라우팅이 다 깨짐**
Ingress 에 `nginx.ingress.kubernetes.io/rewrite-target: /` 를 넣으면 `/api/*`·`/admin` 등 모든 경로가
`/` 로 재작성된다. Carrsh/Obtopus(SPA)는 써도 되지만 No-Marathon(SSR)은 **넣지 않는다**.

**⑧ 홈이 500, 로그에 `집계 조회 실패: Invalid path specified in request URL`**
`NEXT_PUBLIC_SUPABASE_URL` 끝에 슬래시가 붙어(`https://xxx.supabase.co/`) Supabase REST 경로가 이중
슬래시(`…co//rest/v1/…`)가 된 것. GitHub Secret 값에서 trailing slash 제거 후 **재빌드**.
(코드에서도 `env.ts` 가 trailing slash 를 정규화하도록 방어 처리됨 — 커밋 후 재빌드 시 적용.)
참고: 로그가 `live 모드에는 … 가 필요합니다` 면 빌드 때 Supabase Secret 자체가 비었던 것(GitHub Secrets 설정 후 재빌드).
`relation "v_marathon_stats" does not exist` 면 마이그레이션 미적용(루트 README 2번).

---

## 레포 public 전환 시 주의

소스/이미지에 실키 없음(검증: `.env.production` 미커밋, 하드코딩 키 없음). public 전환해도 노출될 비밀은 없다. 단:

1. **`.env.production` 절대 커밋 금지** (이미 gitignore — 유지).
2. **Supabase RLS 반드시 활성화.** anon key + 테이블 구조가 공개되므로 방어선은 오직 RLS 정책. 모든 테이블 RLS on + 정책 점검. (`SUPABASE_SERVICE_ROLE_KEY` 는 번들·이미지에 없어 안전.)
3. GHCR 이미지도 public 으로 두면 pull secret 불필요(A-3 생략).
