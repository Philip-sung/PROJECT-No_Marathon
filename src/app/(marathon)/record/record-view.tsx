'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMarathon } from '@/lib/marathon/context';
import { fetchSummary } from '@/lib/api/client';
import type { Summary } from '@/lib/api/types';
import { formatDurationKo, formatNumber } from '@/lib/format';
import { CountUp } from '@/components/ui/count-up';
import { DisruptionForm } from '@/components/record/disruption-form';
import { CommentSection } from '@/components/record/comment-section';
import { ReportForm } from '@/components/record/report-form';
import { AdSlot } from '@/components/ad-slot';

export function RecordView() {
  const { selected } = useMarathon();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    try {
      setSummary(await fetchSummary(id));
    } catch {
      // 조회 실패 시 빈 상태 유지.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected?.id) {
      void load(selected.id);
    } else {
      setSummary(null);
    }
  }, [selected?.id, load]);

  const refresh = useCallback(() => {
    if (selected?.id) {
      void load(selected.id);
    }
  }, [selected?.id, load]);

  if (!selected) {
    return <p className="text-muted">상단에서 대상 마라톤을 선택해 주세요.</p>;
  }

  const stats = summary?.stats ?? null;
  const disruptions = summary?.disruptions ?? [];
  const comments = summary?.comments ?? [];

  return (
    <div className="space-y-12">
      {/* 합계 히어로 카운터 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass relative overflow-hidden rounded-3xl p-8 text-center shadow-card"
      >
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-accent2/20 blur-3xl" />
        <p className="relative text-xs uppercase tracking-[0.2em] text-muted">
          {selected.name} 으로 허비한 시간
        </p>
        <CountUp
          value={stats?.total_minutes ?? 0}
          format={formatDurationKo}
          className="relative mt-3 block bg-gradient-to-r from-accent2 via-violet to-accent bg-clip-text text-6xl font-extrabold tracking-tight text-transparent"
        />
        <p className="relative mt-3 text-sm text-muted">
          {loading && !stats ? (
            '집계 불러오는 중…'
          ) : (
            <>
              <CountUp value={stats?.entry_count ?? 0} format={formatNumber} />
              명 참여 · 평균 {formatDurationKo(stats?.avg_minutes ?? 0)}
            </>
          )}
        </p>
      </motion.section>

      {/* 입력 */}
      <DisruptionForm marathonId={selected.id} onDone={refresh} />

      {/* 불편자 리스트 */}
      <section>
        <h2 className="text-lg font-bold">불편을 겪은 사람들</h2>
        <ul className="mt-4 space-y-2">
          {disruptions.length === 0 ? (
            <li className="glass rounded-2xl py-8 text-center text-sm text-muted">
              아직 기록이 없습니다. 첫 기록을 남겨주세요.
            </li>
          ) : (
            <AnimatePresence initial={false}>
              {disruptions.map((d, i) => (
                <motion.li
                  key={d.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="glass flex items-center justify-between rounded-2xl px-5 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-muted">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{d.display_name ?? '익명'}</p>
                      {d.note ? (
                        <p className="truncate text-sm text-muted">{d.note}</p>
                      ) : null}
                    </div>
                  </div>
                  <span className="ml-3 flex-none font-bold text-accent2">
                    {formatDurationKo(d.minutes_lost)}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          )}
        </ul>
      </section>

      <AdSlot />

      {/* 주최측 정보 */}
      <section className="glass rounded-2xl p-5 text-sm">
        <h2 className="font-bold">주최측 정보</h2>
        <dl className="mt-3 space-y-1.5 text-muted">
          <div>
            <dt className="inline text-muted/60">주최 </dt>
            <dd className="inline text-fg">
              {selected.organizer_name ?? '정보 없음'}
            </dd>
          </div>
          {selected.organizer_url ? (
            <div>
              <dt className="inline text-muted/60">홈페이지 </dt>
              <dd className="inline">
                <a
                  href={selected.organizer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  {selected.organizer_url}
                </a>
              </dd>
            </div>
          ) : null}
          {selected.organizer_contact ? (
            <div>
              <dt className="inline text-muted/60">연락처 </dt>
              <dd className="inline text-fg">{selected.organizer_contact}</dd>
            </div>
          ) : null}
          {selected.organizer_email ? (
            <div>
              <dt className="inline text-muted/60">이메일 </dt>
              <dd className="inline">
                <a
                  href={`mailto:${selected.organizer_email}`}
                  className="text-accent underline-offset-2 hover:underline"
                >
                  {selected.organizer_email}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {/* 댓글 */}
      <CommentSection
        marathonId={selected.id}
        comments={comments}
        onChanged={refresh}
      />

      {/* 앱 불편 신고 */}
      <ReportForm />
    </div>
  );
}
