'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Marathon } from '@/lib/db/schema';
import { pickNearestMarathonId } from '@/lib/marathon/select';

interface MarathonContextValue {
  marathons: Marathon[];
  selectedId: string | null;
  selected: Marathon | null;
  setSelectedId: (id: string) => void;
}

const MarathonContext = createContext<MarathonContextValue | null>(null);

/**
 * 페이지2(불편기록)·페이지3(우회안내)가 공유하는 마라톤 선택 상태.
 * (marathon) 그룹 레이아웃에 마운트되어 두 페이지 간 네비게이션에도 상태 유지.
 * URL ?m=<id> 와 동기화하여 공유/딥링크 가능(SEO·확산).
 */
export function MarathonProvider({
  marathons,
  children,
}: {
  marathons: Marathon[];
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  // useSearchParams 를 쓰면 Suspense 하위가 클라이언트 전용 렌더로 떨어져 SSR 이
  // 비므로(SEO 손실), URL ?m 은 마운트 후 window 에서 직접 읽는다(ADR-009).
  const [urlChecked, setUrlChecked] = useState(false);
  const userPickedRef = useRef(false);
  const urlHadParamRef = useRef(false);

  // 마운트: URL ?m 1회 읽기.
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get('m');
    if (m) {
      urlHadParamRef.current = true;
      setSelectedIdState(m);
    }
    setUrlChecked(true);
  }, []);

  // 시간 기준 자동선택 — URL 확인 후 아직 선택이 없을 때.
  useEffect(() => {
    if (!urlChecked || selectedId) {
      return;
    }
    const id = pickNearestMarathonId(marathons, { now: new Date() });
    if (id) {
      setSelectedIdState(id);
    }
  }, [urlChecked, selectedId, marathons]);

  // 위치 권한 허용 시 거리까지 반영해 재선택(URL 지정·사용자 수동선택이 없을 때만).
  useEffect(() => {
    if (!urlChecked || urlHadParamRef.current) {
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (userPickedRef.current) {
          return;
        }
        const id = pickNearestMarathonId(marathons, {
          now: new Date(),
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        if (id) {
          setSelectedIdState(id);
        }
      },
      () => {
        // 권한 거부/실패 시 시간 기준 선택 유지(graceful degradation).
      },
      { timeout: 5000, maximumAge: 600000 },
    );
  }, [urlChecked, marathons]);

  const setSelectedId = useMemo(
    () => (id: string) => {
      userPickedRef.current = true;
      setSelectedIdState(id);
      const params = new URLSearchParams(window.location.search);
      params.set('m', id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname],
  );

  const selected = useMemo(
    () => marathons.find((m) => m.id === selectedId) ?? null,
    [marathons, selectedId],
  );

  const value = useMemo<MarathonContextValue>(
    () => ({ marathons, selectedId, selected, setSelectedId }),
    [marathons, selectedId, selected, setSelectedId],
  );

  return (
    <MarathonContext.Provider value={value}>
      {children}
    </MarathonContext.Provider>
  );
}

export function useMarathon(): MarathonContextValue {
  const ctx = useContext(MarathonContext);
  if (!ctx) {
    throw new Error('useMarathon 은 MarathonProvider 내부에서만 사용하세요.');
  }
  return ctx;
}
