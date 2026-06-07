import Link from 'next/link';
import { isMock } from '@/lib/mock';

// Phase 3 플레이스홀더(취지). Phase 4 에서 정제된 카피 + 여론 기반 대책으로 완성.
export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium text-brand-accent">no-marathon.kr</p>
      <h1 className="mt-2 text-3xl font-bold leading-snug tracking-tight">
        주말 마라톤 교통통제,
        <br />
        시민 불편을 함께 기록합니다.
      </h1>
      <p className="mt-4 leading-relaxed text-gray-600">
        마라톤을 막자는 것이 아닙니다. 충분한 교통 대책과 사전 공지를 통해
        불편을 겪는 시민이 없도록 하자는 것입니다.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/record"
          className="rounded-lg bg-gray-900 px-5 py-2.5 font-medium text-white hover:bg-gray-800"
        >
          불편 기록하기
        </Link>
        <Link
          href="/detour"
          className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium hover:bg-gray-50"
        >
          우회 안내 보기
        </Link>
      </div>
      <p className="mt-10 text-xs text-gray-400">
        실행 모드: {isMock ? 'mock (외부 의존 없음)' : 'live'} · Phase 3
        레이아웃 구성 완료
      </p>
    </main>
  );
}
