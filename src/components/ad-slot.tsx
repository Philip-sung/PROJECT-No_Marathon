'use client';

import { useEffect, useRef } from 'react';
import { env } from '@/lib/env';

/**
 * 광고 슬롯. NEXT_PUBLIC_ADSENSE_CLIENT 미설정 시 placeholder(컨셉 보존, prompt §04),
 * 설정 시 실제 AdSense 광고 렌더. 로더 스크립트는 layout 에서 조건부 주입.
 */
export function AdSlot({ label = '광고 영역' }: { label?: string }) {
  const ref = useRef<HTMLModElement | null>(null);
  const client = env.NEXT_PUBLIC_ADSENSE_CLIENT;

  useEffect(() => {
    if (!client) {
      return;
    }
    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch {
      // 광고 로드 실패는 무시.
    }
  }, [client]);

  if (!client) {
    return (
      <div className="my-2 flex h-24 items-center justify-center rounded-2xl border border-dashed border-line text-xs text-muted/50">
        {label} (AdSense placeholder)
      </div>
    );
  }

  return (
    <ins
      ref={ref}
      className="adsbygoogle my-8 block"
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
