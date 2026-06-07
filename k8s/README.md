# 클러스터 배포 (no-marathon.kr)

PROJECT-Obtopus / PROJECT-OIPMonorepo 와 **동일한 쿠버네티스 클러스터**에 배포한다.
이미지는 GitHub Actions(`.github/workflows/build-push.yml`)가 `main` 푸시마다
`ghcr.io/philip-sung/no-marathon-image:{latest,edge,<sha>}` 로 빌드·푸시한다.

배포 흐름: **push main → GHCR 이미지 → 클러스터가 pull → 롤아웃**

## 1. (최초 1회) GHCR pull secret

Obtopus 가 이미 동일 네임스페이스(`philip-sung`)를 쓰므로,
클러스터에 `ghcr-cred-philip-sung` Secret 이 있으면 **그대로 재사용**된다.
없을 때만 생성한다. `<PAT>` 는 `read:packages` 권한의 GitHub Personal Access Token.

```bash
kubectl create secret docker-registry ghcr-cred-philip-sung \
  --docker-server=ghcr.io \
  --docker-username=philip-sung \
  --docker-password=<PAT> \
  --docker-email=spinnavor@naver.com
```

> GHCR 패키지(no-marathon-image)를 **public** 으로 전환하면 pull secret 없이도 당겨올 수 있다.
> 단, deployment.yaml 의 `imagePullSecrets` 는 남겨둬도 무해하다.

## 2. (최초 1회) 런타임 secret — `no-marathon-env`

`NEXT_PUBLIC_*` 는 빌드 타임에 인라인되므로 워크플로 build-arg(GitHub Secrets/Variables)로 주입한다.
**서버 전용 secret 은 런타임에 주입** — `.env.production` 을 채운 뒤 그대로 Secret 으로 만든다.

```bash
# .env.production 에 실제 키를 채운 상태에서:
kubectl create secret generic no-marathon-env --from-env-file=.env.production
```

포함 키: `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `AGENT_TRIGGER_SECRET`,
`ADMIN_PASSCODE`, `DEVICE_HASH_SALT`, `NAVER_MAIL_USER`, `NAVER_MAIL_APP_PASSWORD`,
`COLLECTION_REPORT_EMAIL` 등. (NEXT_PUBLIC_* 도 들어가 있어도 무해)

값 변경 시 교체:

```bash
kubectl create secret generic no-marathon-env \
  --from-env-file=.env.production --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deployment/no-marathon-deployment
```

## 3. 배포

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

서비스는 ClusterIP(`no-marathon-service`, port 80 → 컨테이너 3000)다.
외부 노출은 클러스터의 기존 Ingress/게이트웨이에서 이 서비스로 라우팅을 추가한다
(Obtopus 서비스와 동일한 방식).

## 4. 갱신/롤백

```bash
# main 푸시 → 이미지 자동 빌드. 새 이미지 강제 반영:
kubectl rollout restart deployment/no-marathon-deployment

# 상태/로그
kubectl rollout status deployment/no-marathon-deployment
kubectl logs -l app=no-marathon-pod -f

# 특정 커밋으로 롤백(불변 태그)
kubectl set image deployment/no-marathon-deployment \
  no-marathon=ghcr.io/philip-sung/no-marathon-image:<sha>
```
