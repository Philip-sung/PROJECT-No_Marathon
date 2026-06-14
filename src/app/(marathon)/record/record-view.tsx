'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMarathon } from '@/lib/marathon/context';
import { fetchSummary } from '@/lib/api/client';
import type { Summary } from '@/lib/api/types';
import { formatDurationKo, formatNumber, formatRelativeKo } from '@/lib/format';
import { CountUp } from '@/components/ui/count-up';
import { DisruptionForm } from '@/components/record/disruption-form';
import { CommentSection } from '@/components/record/comment-section';
import { ReportForm } from '@/components/record/report-form';
import { AdSlot } from '@/components/ad-slot';

const PAGE = 10;
const POLL_MS = 7000;

export function RecordView() {
  const { selected } = useMarathon();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(PAGE);

  const load = useCallback(async (id: string, silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      setSummary(await fetchSummary(id));
    } catch {
      // 조회 실패 시 기존 상태 유지.
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  // 마라톤 변경 시 초기 로드 + 페이지 리셋.
  useEffect(() => {
    setVisible(PAGE);
    if (selected?.id) {
      void load(selected.id);
    } else {
      setSummary(null);
    }
  }, [selected?.id, load]);

  // 주기 폴링(짧게) — 새 기록/댓글 자동 반영. 탭이 숨겨지면 건너뜀.
  useEffect(() => {
    if (!selected?.id) {
      return;
    }
    const id = selected.id;
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      void load(id, true);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [selected?.id, load]);

  const refresh = useCallback(() => {
    if (selected?.id) {
      void load(selected.id, true);
    }
  }, [selected?.id, load]);

  if (!selected) {
    return <p className="text-muted">상단에서 대상 마라톤을 선택해 주세요.</p>;
  }

  const stats = summary?.stats ?? null;
  const disruptions = summary?.disruptions ?? [];
  const comments = summary?.comments ?? [];
  const shown = disruptions.slice(0, visible);

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

      {/* 불편자 리스트 (최신순) */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">불편을 겪은 사람들</h2>
          <span className="text-xs text-muted">최신순</span>
        </div>
        <ul className="mt-4 space-y-2">
          {shown.length === 0 ? (
            <li className="glass rounded-2xl py-8 text-center text-sm text-muted">
              아직 기록이 없습니다. 첫 기록을 남겨주세요.
            </li>
          ) : (
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((d) => (
                <motion.li
                  key={d.id}
                  layout
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="glass rounded-2xl px-5 py-3.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{d.display_name ?? '익명'}</p>
                    <span className="flex-none font-bold text-accent2">
                      {formatDurationKo(d.minutes_lost)}
                    </span>
                  </div>
                  {d.note ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-fg/90">
                      “{d.note}”
                    </p>
                  ) : (
                    <p className="mt-1.5 text-sm text-muted/50">
                      (남긴 내용 없음)
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-muted">
                    {[selected.area, d.region, formatRelativeKo(d.created_at)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </motion.li>
              ))}
            </AnimatePresence>
          )}
        </ul>
        {disruptions.length > visible ? (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className="mt-3 w-full rounded-full border border-line py-2.5 text-sm text-muted transition hover:border-accent/40 hover:text-fg"
          >
            더보기 ({disruptions.length - visible}개 더)
          </button>
        ) : null}
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
