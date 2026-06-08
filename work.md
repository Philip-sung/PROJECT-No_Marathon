# work.md — 작업 재개 핸드오프 (2026-06-08 기준)

no-marathon.kr 을 k3s 클러스터(Obtopus/OIP 와 동일)에 배포하는 작업의 현재 상태·남은 일.
배포 상세는 [k8s/README.md](k8s/README.md) 런북 참조. 이 문서는 "지금 어디까지 됐고 다음에 뭘 하면 되는가".

---

## 1. 한 줄 상태

사이트는 **https://no-marathon.kr 라이브(HTTPS 200)** 이고 홈도 정상 렌더된다.
남은 건 **(a) 로컬 커밋 push → 재배포, (b) 수집(collect) 400 원인 규명(크레딧 의심), (c) cron 등록** 세 가지.

---

## 2. 환경 사실 (확인된 값 — 바뀌면 갱신)

| 항목 | 값 |
|---|---|
| 클러스터 | k3s, 노드 호스트명 `khrsh`, 공인 IP `158.247.222.158` |
| 인그레스 | ingress-nginx **NodePort** `80:32527`, `443:30471` |
| TLS | **호스트 nginx + certbot(Let's Encrypt)**. cert-manager·Cloudflare **없음**. `/etc/nginx/conf.d/no-marathon-proxy.conf` 가 443 종단 → `127.0.0.1:32527` 프록시 |
| 이미지 | `ghcr.io/philip-sung/no-marathon-image:{latest,edge,<sha>}` |
| GitOps | **없음** — manifest 는 `kubectl apply` 수동(Actions 는 이미지 빌드까지만) |
| 런타임 secret | `no-marathon-env` (`.env.production` 에서 생성) |
| pull secret | `ghcr-cred-philip-sung` |
| 빌드타임 secret | GitHub 레포 Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Supabase | 프로젝트 ref `zabutbztxeiiaeqpgmfl` |
| 레포 분담 | 앱 deployment/service = 이 레포 `k8s/`; Ingress = **PROJECT-ClusterInfra** `ingress/NoMarathonIngressResource.yaml` |

---

## 3. 완료한 것 (이 레포 커밋 — 일부만 origin push됨)

```
49bdb63 perf(agent): 토큰 폭주 차단 + 메일 보고 견고화
5e2da02 fix(env): SUPABASE_URL 을 origin 으로 정규화 (홈 500 수정)
b847666 fix(env): trailing slash 정규화
dc78b3f docs(deploy): 클러스터 배포 런북 통합
39eb3a2 chore(deploy): npm run kube-deploy:all 스크립트 추가
5ff7b90 docs(deploy): TLS 구조 정정(호스트 nginx + certbot)
83b984f docs(deploy): 배포 가이드 보강
bbabc16 fix(lock): @emnapi 레코드 추가 (리눅스 npm ci 수정)
34ddb32 feat(ad): AdSense 미도입 시 빈 슬롯 숨김
fc13d90 ci(deploy): GHCR 빌드·푸시 + k8s 매니페스트
```

해결된 이슈들:
- 홈 500 (`Invalid path`) → `NEXT_PUBLIC_SUPABASE_URL` 에 `/rest/v1/` 가 붙어 경로 이중화 → `env.ts` 가 `new URL(s).origin` 으로 정규화. **GitHub Secret 값도 고쳐야 함**(아래 4-D).
- 홈 `v_marathon_stats not found` → Supabase 마이그레이션 미적용 → **적용 완료**.
- 308 리다이렉트 루프 → Ingress 에서 `tls:` 블록 제거.
- 리눅스 `npm ci` 실패 → lockfile @emnapi 보강.

**PROJECT-ClusterInfra 레포**: `ingress/NoMarathonIngressResource.yaml` 에 tls 제거 + proxy 타임아웃(300s) 어노테이션 추가됨 — **아직 커밋 안 됨**(그 레포에서 commit/push 필요).

---

## 4. 남은 작업 (순서대로)

### A. 로컬 커밋 push → 재배포  ★먼저
SSH 키 문제로 AI 가 push 못 함 → **본인 PC에서**:
```bash
# 이 레포
git push
# PROJECT-ClusterInfra (ingress tls 제거본)
cd ../PROJECT-ClusterInfra && git add ingress/NoMarathonIngressResource.yaml && git commit -m "fix(ingress): no-marathon tls 제거 + proxy timeout" && git push
```
→ GitHub Actions 'Build & Push' 초록불 확인 후 **VM에서**:
```bash
cd ~/PROJECT-No_Marathon && git pull && npm run kube-deploy:all
cd ~/PROJECT-ClusterInfra && git pull && kubectl apply -f ingress/NoMarathonIngressResource.yaml
```

### B. 수집(collect) 400 원인 규명  ★핵심 미해결
- 현재 `/api/agent/collect` 가 `Anthropic API 오류: 400` 으로 실패(토큰 0).
- **유력 가설: 크레딧/스펜드 한도** — 디버깅 중 ~$18(5.3M 입력토큰·웹검색 162회) 소진 후 잔액 바닥/한도 초과로 400(billing) 가능성. (web_search 가 162회 성공했으므로 호출 자체는 정상 작동했었음 = 코드 문제 아닐 가능성)
- 방금 커밋(49bdb63)으로 **에러 본문이 메일·로그에 찍히게** 했으니, 재배포 후 수집 1회 돌리면 확정됨:
  ```bash
  S=$(kubectl exec deploy/no-marathon-deployment -- printenv AGENT_TRIGGER_SECRET)
  curl -s -XPOST -H "x-agent-secret: $S" https://no-marathon.kr/api/agent/collect
  kubectl logs deploy/no-marathon-deployment --since=3m --timestamps | tail -40
  ```
- 본문에 `credit`/`billing` 류면 → **Anthropic Console 에서 크레딧 충전 / 스펜드 한도 상향**(코드 아님).

### C. cron 등록 (현재 미등록 — 자동 수집 안 됨)
수집이 200 으로 정상화된 뒤, VM에서:
```bash
S=$(kubectl exec deploy/no-marathon-deployment -- printenv AGENT_TRIGGER_SECRET)
( crontab -l 2>/dev/null | grep -v 'agent/collect'; \
  echo "0 4 * * * curl -s -XPOST -H \"x-agent-secret: $S\" https://no-marathon.kr/api/agent/collect >> /var/log/nm-agent.log 2>&1" ) | crontab -
crontab -l
```

### D. 정리·보안 (여유 시)
- **GitHub Secret `NEXT_PUBLIC_SUPABASE_URL`** 값에서 `/rest/v1/` 제거 → `https://zabutbztxeiiaeqpgmfl.supabase.co` (코드가 정규화하지만 값도 깔끔히). 빌드타임이라 수정 후 재빌드.
- **`.env.production`** 8번 줄도 동일하게 origin 으로 수정.
- **`AGENT_TRIGGER_SECRET`** 가 현재 `agent_trigger_secret`(추측 가능) → `openssl rand -hex 32` 로 교체. 바꾸면 ① `.env.production` → `no-marathon-env` 재생성 + `rollout restart` ② crontab 값도 동기화.
- **Anthropic Console 스펜드 한도** 설정(폭주 재발 방지 안전망).

---

## 5. 비용 사고 메모 (결론: 유출 아님)

- Anthropic Console: 입력 5,312,255 / 출력 46,165 / 웹검색 162회, 전부 `claude-sonnet-4-6`, **Jun 07 23:00 UTC**(= 우리 디버깅 시간대)에 집중. ≈ **$18**.
- 시각·모델·web_search 패턴이 전부 우리 에이전트와 일치 → **외부 악용/키 유출 아님, 우리 디버깅 비용**.
- 폭주 원인: web_search 결과를 pause_turn 재개마다 통째 재전송(캐싱 없음) + 검색 남발 + 호출 내부에서 예산 가드가 못 멈춤.
- **49bdb63 에서 전부 완화**: max_uses=4, 프롬프트 캐싱, continuation 2, 입력토큰 80k 상한, judge=Haiku. 예상 한 run < $1.

---

## 6. 자주 쓰는 명령

```bash
# 배포(코드 바꾼 뒤): push → Actions 초록불 → VM에서
npm run kube-deploy:all

# 파드 상태/로그
kubectl get pods -l app=no-marathon-pod
kubectl logs deploy/no-marathon-deployment --since=5m --timestamps | tail -50

# 헬스/홈 확인
curl -sI https://no-marathon.kr/api/health
curl -s -o /dev/null -w "%{http_code}\n" https://no-marathon.kr/

# 베이크된 supabase URL 확인(슬래시/경로 없이 .co 로 끝나야 정상)
kubectl exec deploy/no-marathon-deployment -- grep -rhoE "https://[a-z0-9.-]+\.supabase\.co[a-z0-9/_-]*" /app/.next/server | sort -u

# 런타임 secret 갱신
kubectl create secret generic no-marathon-env --from-env-file=.env.production --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deployment/no-marathon-deployment
```
