'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 분석 비콘(자산화 헤지). 경로 변경 시 page_view 이벤트 적재(fire-and-forget).
 * 실패해도 사용자 흐름에 영향 없음.
 */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'page_view',
        props: { path: pathname },
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);
  return null;
}
