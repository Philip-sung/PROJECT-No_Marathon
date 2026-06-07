'use client';

import { useMarathon } from '@/lib/marathon/context';

// Phase 3 플레이스홀더. Phase 6 에서 위치권한 기반 우회/대중교통 지침 구현.
export function DetourView() {
  const { selected } = useMarathon();
  return (
    <section>
      <h1 className="text-2xl font-bold">우회 안내</h1>
      <p className="mt-2 text-gray-600">
        선택된 마라톤의 우회·대중교통 지침은 Phase 6 에서 구현됩니다.
      </p>
      <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4 text-sm">
        대상: <span className="font-semibold">{selected?.name ?? '없음'}</span>
      </div>
    </section>
  );
}
