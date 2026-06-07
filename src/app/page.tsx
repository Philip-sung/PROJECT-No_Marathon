import Link from 'next/link';
import { getAllMarathonStats } from '@/lib/data/stats';
import { getMeasures } from '@/lib/data/measures';
import { formatDurationKo, formatNumber } from '@/lib/format';

// 페이지 ① 취지 — 정제된 카피 + 데이터/스토리 + 여론 기반 대책 + 행동 유도.
// 서버 컴포넌트(집계·대책 SSR → SEO). prompt.md §01-1, §02.
export default async function Home() {
  const [stats, measures] = await Promise.all([
    getAllMarathonStats(),
    getMeasures(),
  ]);
  const totalMinutes = stats.reduce((sum, s) => sum + s.total_minutes, 0);
  const totalEntries = stats.reduce((sum, s) => sum + s.entry_count, 0);

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      {/* Hero — 문제 한 문장 + 선의의 취지 */}
      <p className="text-sm font-semibold text-brand-accent">no-marathon.kr</p>
      <h1 className="mt-2 text-3xl font-bold leading-snug tracking-tight sm:text-4xl">
        주말 마라톤 교통통제,
        <br />
        시민 불편을 함께 기록합니다.
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-gray-700">
        마라톤을 막자는 것이 아닙니다. 충분한 교통 대책과 사전 공지로,
        <strong className="font-semibold"> 불편을 겪는 시민이 없도록 </strong>
        하자는 것입니다.
      </p>

      {/* 데이터+스토리 — 집계 헤드라인 */}
      <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-sm text-gray-500">지금까지 기록된 불편</p>
        <p className="mt-1 text-2xl font-bold">
          {formatDurationKo(totalMinutes)}
          <span className="ml-2 text-base font-normal text-gray-500">
            · {formatNumber(totalEntries)}건의 기록
          </span>
        </p>
        <p className="mt-2 text-sm text-gray-600">
          한 사람 한 사람의 시간이 모이면 숫자가 됩니다. 당신의 시간도 함께
          기록해 주세요.
        </p>
        <Link
          href="/record"
          className="mt-4 inline-block rounded-lg bg-gray-900 px-5 py-2.5 font-medium text-white hover:bg-gray-800"
        >
          내 불편 기록하기 →
        </Link>
      </section>

      {/* 여론 기반 대책 */}
      <section className="mt-12">
        <h2 className="text-xl font-bold">우리가 요구하는 대책</h2>
        <p className="mt-1 text-sm text-gray-500">
          뉴스 댓글 등 여론에서 자주 제기된 현실적인 요구입니다.
        </p>
        <ul className="mt-5 space-y-3">
          {measures.map((m, i) => (
            <li
              key={m.id}
              className="rounded-lg border border-gray-200 p-4 transition hover:border-gray-300"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{m.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    {m.description}
                  </p>
                  {m.source_hint ? (
                    <p className="mt-1 text-xs text-gray-400">
                      {m.source_hint}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 행동 유도 */}
      <section className="mt-12 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/record"
          className="flex-1 rounded-lg bg-gray-900 px-5 py-3 text-center font-medium text-white hover:bg-gray-800"
        >
          불편 기록하기
        </Link>
        <Link
          href="/detour"
          className="flex-1 rounded-lg border border-gray-300 px-5 py-3 text-center font-medium hover:bg-gray-50"
        >
          우회 안내 보기
        </Link>
      </section>
    </main>
  );
}
