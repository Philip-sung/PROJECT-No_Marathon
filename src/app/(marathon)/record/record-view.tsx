'use client';

import { useMarathon } from '@/lib/marathon/context';

// Phase 3 플레이스홀더. Phase 5 에서 집계/입력/댓글/신고 구현.
export function RecordView() {
  const { selected } = useMarathon();
  return (
    <section>
      <h1 className="text-2xl font-bold">불편 기록</h1>
      <p className="mt-2 text-gray-600">
        선택된 마라톤의 불편 시간 합계와 입력은 Phase 5 에서 구현됩니다.
      </p>
      <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4 text-sm">
        대상: <span className="font-semibold">{selected?.name ?? '없음'}</span>
      </div>
    </section>
  );
}
