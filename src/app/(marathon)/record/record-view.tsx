'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMarathon } from '@/lib/marathon/context';
import { fetchSummary } from '@/lib/api/client';
import type { Summary } from '@/lib/api/types';
import { formatDurationKo, formatNumber } from '@/lib/format';
import { DisruptionForm } from '@/components/record/disruption-form';
import { CommentSection } from '@/components/record/comment-section';
import { ReportForm } from '@/components/record/report-form';
import { AdSlot } from '@/components/ad-slot';

export function RecordView() {
  const { selected } = useMarathon();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await fetchSummary(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기에 실패했습니다.');
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
    return (
      <p className="text-gray-500">상단에서 대상 마라톤을 선택해 주세요.</p>
    );
  }

  const stats = summary?.stats ?? null;
  const disruptions = summary?.disruptions ?? [];
  const comments = summary?.comments ?? [];

  return (
    <div className="space-y-10">
      {/* 합계 헤드라인 */}
      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">
          {selected.name} 으로 시민들이 허비한 시간
        </p>
        <p className="mt-2 text-4xl font-extrabold tracking-tight text-brand-accent">
          {stats ? formatDurationKo(stats.total_minutes) : '—'}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {stats
            ? `${formatNumber(stats.entry_count)}명 참여 · 평균 ${formatDurationKo(stats.avg_minutes)}`
            : loading
              ? '집계 불러오는 중…'
              : ''}
        </p>
      </section>

      {/* 불편자 리스트 */}
      <section>
        <h2 className="text-lg font-bold">불편을 겪은 사람들</h2>
        <ul className="mt-3 space-y-2">
          {disruptions.length === 0 ? (
            <li className="py-6 text-center text-sm text-gray-400">
              아직 기록이 없습니다. 첫 기록을 남겨주세요.
            </li>
          ) : (
            disruptions.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{d.display_name ?? '익명'}</p>
                  {d.note ? (
                    <p className="truncate text-sm text-gray-500">{d.note}</p>
                  ) : null}
                </div>
                <span className="ml-3 flex-none font-semibold text-brand-accent">
                  {formatDurationKo(d.minutes_lost)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* 입력 */}
      <DisruptionForm marathonId={selected.id} onDone={refresh} />

      <AdSlot />

      {/* 주최측 정보 */}
      <section className="rounded-lg border border-gray-200 p-4 text-sm">
        <h2 className="font-bold">주최측 정보</h2>
        <dl className="mt-2 space-y-1 text-gray-600">
          <div>
            <dt className="inline text-gray-400">주최 </dt>
            <dd className="inline">{selected.organizer_name ?? '정보 없음'}</dd>
          </div>
          {selected.organizer_url ? (
            <div>
              <dt className="inline text-gray-400">홈페이지 </dt>
              <dd className="inline">
                <a
                  href={selected.organizer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {selected.organizer_url}
                </a>
              </dd>
            </div>
          ) : null}
          {selected.organizer_contact ? (
            <div>
              <dt className="inline text-gray-400">연락처 </dt>
              <dd className="inline">{selected.organizer_contact}</dd>
            </div>
          ) : null}
          {selected.organizer_email ? (
            <div>
              <dt className="inline text-gray-400">이메일 </dt>
              <dd className="inline">
                <a
                  href={`mailto:${selected.organizer_email}`}
                  className="text-blue-600 underline"
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

      {error ? <p className="text-sm text-brand-accent">{error}</p> : null}

      {/* 앱 불편 신고 */}
      <ReportForm />
    </div>
  );
}
