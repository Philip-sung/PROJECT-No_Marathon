import { isMock, MOCK_MARATHONS } from '@/lib/mock';

// Phase 1 부트스트랩 확인용 임시 홈. Phase 3~4 에서 실제 취지 페이지로 대체.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-medium text-brand-accent">no-marathon.kr</p>
      <h1 className="text-3xl font-bold tracking-tight">
        부트스트랩 완료 — Phase 1
      </h1>
      <p className="leading-relaxed text-gray-600">
        Next.js(App Router) + Supabase + Zod + Tailwind 스캐폴딩이 동작합니다.
        다음 단계(Phase 2)에서 데이터 모델과 스키마를 구성합니다.
      </p>
      <div className="rounded-lg border border-gray-200 p-4 text-sm">
        <p>
          실행 모드:{' '}
          <span className="font-mono font-semibold">
            {isMock ? 'mock (외부 의존 없음)' : 'live'}
          </span>
        </p>
        <p className="mt-1 text-gray-500">
          샘플 마라톤: {MOCK_MARATHONS[0]?.name ?? '없음'}
        </p>
      </div>
    </main>
  );
}
