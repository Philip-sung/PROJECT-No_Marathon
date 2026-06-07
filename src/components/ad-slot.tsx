'use client';

import { useEffect, type ReactNode } from 'react';
import { env } from '@/lib/env';

/**
 * 광고/배너 슬롯. 우선순위:
 *  1) fallback prop 이 있으면 그것을 렌더(공익 이미지·후원 배너 등 커스텀 교체용)
 *  2) NEXT_PUBLIC_ADSENSE_CLIENT(+slot) 설정 시 실제 AdSense 광고
 *  3) 둘 다 없으면 placeholder
 * slot 미지정 시 NEXT_PUBLIC_ADSENSE_SLOT 사용. (Auto Ads 만 쓸 땐 ins 없이 로더만으로 동작)
 */
export function AdSlot({
  label = '광고 영역',
  slot,
  fallback,
}: {
  label?: string;
  slot?: string;
  fallback?: ReactNode;
}) {
  const client = env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const adSlot = slot ?? env.NEXT_PUBLIC_ADSENSE_SLOT;
  const showAd = Boolean(client && adSlot && !fallback);

  useEffect(() => {
    if (!showAd) {
      return;
    }
    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch {
      // 광고 로드 실패는 무시.
    }
  }, [showAd]);

  // 1) 커스텀 교체(이미지/배너)
  if (fallback) {
    return <div className="my-6">{fallback}</div>;
  }

  // 2) 실제 AdSense
  if (showAd) {
    return (
      <ins
        className="adsbygoogle my-8 block"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    );
  }

  // 3) placeholder
  return (
    <div className="my-2 flex h-24 items-center justify-center rounded-2xl border border-dashed border-line text-xs text-muted/50">
      {label} (AdSense placeholder)
    </div>
  );
}
