'use client';

import { useEffect, useState } from 'react';
import { useMarathon } from '@/lib/marathon/context';

/**
 * 마라톤 선택기. 현재 선택을 버튼으로 표시하고, 누르면 모달 목록으로 변경.
 * 모바일·웹 공통(prompt.md §02): 기본 1개 자동지정 + 탭하면 모달.
 */
export function MarathonSelector() {
  const { selected, marathons, setSelectedId } = useMarathon();
  const [open, setOpen] = useState(false);

  // ESC 로 닫기
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3 text-left hover:border-gray-400"
        aria-haspopup="dialog"
      >
        <span>
          <span className="block text-xs text-gray-500">대상 마라톤</span>
          <span className="block font-semibold">
            {selected ? selected.name : '선택된 마라톤 없음'}
          </span>
          {selected ? (
            <span className="block text-xs text-gray-500">
              {selected.event_date} · {selected.area}
            </span>
          ) : null}
        </span>
        <span className="text-sm text-brand-accent">변경 ▾</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="마라톤 선택"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">마라톤 선택</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                닫기 ✕
              </button>
            </div>
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {marathons.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-gray-400">
                  등록된 마라톤이 없습니다.
                </li>
              ) : (
                marathons.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(m.id);
                        setOpen(false);
                      }}
                      className={
                        selected?.id === m.id
                          ? 'w-full rounded-lg border border-brand-accent bg-red-50 px-3 py-2 text-left'
                          : 'w-full rounded-lg border border-transparent px-3 py-2 text-left hover:bg-gray-50'
                      }
                    >
                      <span className="block font-medium">{m.name}</span>
                      <span className="block text-xs text-gray-500">
                        {m.event_date} · {m.area}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
