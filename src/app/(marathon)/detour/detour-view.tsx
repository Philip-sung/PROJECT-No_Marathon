'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useMarathon } from '@/lib/marathon/context';
import { ControlZoneSchema } from '@/lib/agent/types';
import { fetchSummary } from '@/lib/api/client';
import type { CommentPublic } from '@/lib/db/schema';
import { formatControlPeriod } from '@/lib/format';
import { DetourMap } from '@/components/detour-map';
import { CommentSection } from '@/components/record/comment-section';

const DetourInfoSchema = z.object({
  subway: z.array(z.string()).default([]),
  bus: z.array(z.string()).default([]),
  note: z.string().optional(),
});

const POLL_MS = 9000;

export function DetourView() {
  const { selected } = useMarathon();
  const [comments, setComments] = useState<CommentPublic[]>([]);

  const load = useCallback(async (id: string) => {
    try {
      const s = await fetchSummary(id);
      setComments(s.comments);
    } catch {
      // 무시(우회 댓글 조회 실패).
    }
  }, []);

  useEffect(() => {
    if (selected?.id) {
      void load(selected.id);
    } else {
      setComments([]);
    }
  }, [selected?.id, load]);

  useEffect(() => {
    if (!selected?.id) {
      return;
    }
    const id = selected.id;
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      void load(id);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [selected?.id, load]);

  const refresh = useCallback(() => {
    if (selected?.id) {
      void load(selected.id);
    }
  }, [selected?.id, load]);

  const detour = useMemo(() => {
    const parsed = DetourInfoSchema.safeParse(selected?.detour_info ?? {});
    return parsed.success ? parsed.data : { subway: [], bus: [] };
  }, [selected]);

  const zone = useMemo(() => {
    const parsed = ControlZoneSchema.safeParse(selected?.control_zone ?? {});
    return parsed.success ? parsed.data : {};
  }, [selected]);

  if (!selected) {
    return <p className="text-muted">상단에서 대상 마라톤을 선택해 주세요.</p>;
  }

  const center =
    zone.center ??
    (selected.lat != null && selected.lng != null
      ? { lat: selected.lat, lng: selected.lng }
      : null);
  const controlPeriod = formatControlPeriod(
    selected.start_time,
    selected.end_time,
  );
  const noInfo = !center && !controlPeriod;

  const naverUrl = `https://map.naver.com/p/search/${encodeURIComponent(selected.area)}`;
  const kakaoUrl = `https://map.kakao.com/?q=${encodeURIComponent(selected.area)}`;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">우회 안내</h1>
        <p className="mt-2 text-muted">
          <span className="font-semibold text-fg">{selected.name}</span> ·{' '}
          {selected.area}
        </p>
      </section>

      {/* 통제구간 지도 + 통제시간 */}
      {noInfo ? (
        <section className="glass rounded-2xl p-6 text-center text-sm text-muted">
          해당 마라톤의 통제구간/시간 정보를 알 수 없습니다.
          <br />
          <span className="text-xs text-muted/70">
            수집 에이전트가 정보를 모으면 자동으로 표시됩니다.
          </span>
        </section>
      ) : (
        <section className="space-y-3">
          {center ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <DetourMap
                lat={center.lat}
                lng={center.lng}
                radiusM={zone.radius_m ?? 1200}
                polygon={zone.polygon}
              />
              <p className="mt-1.5 text-xs text-muted/70">
                붉은 영역이 대략적인 통제 구간입니다(근사).
              </p>
            </motion.div>
          ) : (
            <p className="glass rounded-2xl p-4 text-sm text-muted">
              통제 구간 위치 정보를 알 수 없습니다.
            </p>
          )}

          <div className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted">
              통제 시간
            </p>
            <p className="mt-1 font-semibold">
              {controlPeriod ?? '통제 시간 정보를 알 수 없습니다.'}
            </p>
          </div>
        </section>
      )}

      {/* 우회로 공유 댓글 */}
      <CommentSection
        marathonId={selected.id}
        comments={comments}
        onChanged={refresh}
        channel="detour"
        title="우회로 공유"
        placeholder="이 구간은 이렇게 우회하세요 (예: 종각역에서 1호선 이용)"
        captureRegion
        showRegion
      />

      {/* 대중교통 안내 */}
      <section>
        <h2 className="text-lg font-bold">대중교통 안내</h2>
        {detour.subway.length === 0 && detour.bus.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            상세 우회 정보가 아직 등록되지 않았습니다. 통제 시간대에는 도심
            도로보다 <b className="text-fg">지하철 이용</b>을 권장합니다.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {detour.subway.length > 0 ? (
              <div className="glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-accent">지하철</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted">
                  {detour.subway.map((s, i) => (
                    <li key={i}>· {s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {detour.bus.length > 0 ? (
              <div className="glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-accent">버스</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted">
                  {detour.bus.map((s, i) => (
                    <li key={i}>· {s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* 외부 지도 */}
      <section>
        <h2 className="text-lg font-bold">지도 앱에서 길찾기</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <a
            href={naverUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass flex-1 rounded-full px-4 py-3 text-center font-medium transition hover:border-accent/50"
          >
            네이버 지도
          </a>
          <a
            href={kakaoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass flex-1 rounded-full px-4 py-3 text-center font-medium transition hover:border-accent/50"
          >
            카카오맵
          </a>
        </div>
      </section>
    </div>
  );
}
