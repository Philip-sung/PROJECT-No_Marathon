import { getAllMarathonStats } from '@/lib/data/stats';
import { getMeasures } from '@/lib/data/measures';
import { HomeView } from './home-view';

// 동적 렌더(SSR on demand): 빌드 시 DB 접속 불필요 + 런타임마다 최신 집계 반영
// (cron 수집/방문자 기록이 즉시 반영됨). live 빌드가 빈 키로도 통과.
export const dynamic = 'force-dynamic';

// 페이지 ① 취지 — 서버에서 집계/대책 fetch(SSR/SEO) 후 클라이언트 모션 뷰로 렌더.
export default async function Home() {
  const [stats, measures] = await Promise.all([
    getAllMarathonStats(),
    getMeasures(),
  ]);
  const totalMinutes = stats.reduce((sum, s) => sum + s.total_minutes, 0);
  const totalEntries = stats.reduce((sum, s) => sum + s.entry_count, 0);

  return (
    <HomeView
      totalMinutes={totalMinutes}
      totalEntries={totalEntries}
      measures={measures}
    />
  );
}
