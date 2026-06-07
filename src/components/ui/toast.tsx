'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<
  ((kind: ToastKind, message: string) => void) | null
>(null);

let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    seq += 1;
    const id = seq;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={
                t.kind === 'error'
                  ? 'glass rounded-full px-5 py-2.5 text-sm text-accent2 shadow-glow-rose'
                  : t.kind === 'success'
                    ? 'glass rounded-full px-5 py-2.5 text-sm text-accent shadow-glow'
                    : 'glass rounded-full px-5 py-2.5 text-sm text-fg'
              }
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast 는 ToastProvider 내부에서만 사용하세요.');
  }
  return ctx;
}
