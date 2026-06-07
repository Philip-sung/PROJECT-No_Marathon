import { getPublishedMarathons } from '@/lib/data/marathons';
import { MarathonProvider } from '@/lib/marathon/context';
import { MarathonSelector } from '@/components/marathon-selector';

// 동적 렌더(SSR on demand): 빌드 시 DB 접속 불필요 + 런타임마다 최신 published 목록 반영.
export const dynamic = 'force-dynamic';

/**
 * (marathon) 그룹: 페이지2(불편기록)·페이지3(우회안내) 공통 레이아웃.
 * 마라톤 선택 상태를 두 페이지가 공유(그룹 레이아웃이 네비게이션 간 유지).
 */
export default async function MarathonGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const marathons = await getPublishedMarathons();
  return (
    <MarathonProvider marathons={marathons}>
      <main className="mx-auto max-w-2xl px-6 py-8">
        <MarathonSelector />
        {children}
      </main>
    </MarathonProvider>
  );
}
