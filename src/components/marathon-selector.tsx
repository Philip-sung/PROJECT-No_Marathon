'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMarathon } from '@/lib/marathon/context';

/**
 * 마라톤 선택기. 현재 선택을 글래스 버튼으로 표시, 누르면 모달 목록(애니메이션).
 * 모바일·웹 공통(prompt §02): 기본 1개 자동지정 + 탭하면 모달.
 */
export function MarathonSelector() {
  const { selected, marathons, setSelectedId } = useMarathon();
  const [open, setOpen] = useState(false);

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
    <div className="mb-8">
      <motion.button
        type="button"
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen(true)}
        className="glass flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left transition hover:border-accent/40"
        aria-haspopup="dialog"
      >
        <span>
          <span className="block text-xs uppercase tracking-wider text-muted">
            대상 마라톤
          </span>
          <span className="mt-0.5 block font-semibold">
            {selected ? selected.name : '선택된 마라톤 없음'}
          </span>
          {selected ? (
            <span className="block text-xs text-muted">
              {selected.event_date} · {selected.area}
            </span>
          ) : null}
        </span>
        <span className="text-sm font-medium text-accent">변경 ▾</span>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="마라톤 선택"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="glass w-full max-w-md rounded-t-3xl p-4 sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold">마라톤 선택</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm text-muted hover:text-fg"
                >
                  닫기 ✕
                </button>
              </div>
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {marathons.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-muted">
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
                        className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                          selected?.id === m.id
                            ? 'border border-accent/50 bg-accent/10'
                            : 'border border-transparent hover:bg-white/5'
                        }`}
                      >
                        <span className="block font-medium">{m.name}</span>
                        <span className="block text-xs text-muted">
                          {m.event_date} · {m.area}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
