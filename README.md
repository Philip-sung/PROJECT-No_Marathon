# no-marathon.kr

서울 주말 마라톤 교통통제로 인한 시민 불편을 기록·집계하고, 대책을 요구하며, 우회 정보를 제공하는 공익 웹사이트.

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
