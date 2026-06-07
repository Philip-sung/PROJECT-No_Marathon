'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 숫자 카운트업 애니메이션(인터랙티브 핵심). value 변경 시 부드럽게 증가/감소.
 * format 으로 표시 형식 지정(예: 분 → "N시간 M분").
 */
export function CountUp({
  value,
  duration = 900,
  format,
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      fromRef.current = value;
    };
  }, [value, duration]);

  return (
    <span className={className}>{format ? format(display) : display}</span>
  );
}
