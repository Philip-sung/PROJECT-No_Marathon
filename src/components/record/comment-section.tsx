'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CommentPublic } from '@/lib/db/schema';
import { LIMITS } from '@/lib/db/constants';
import { orderCommentsForDisplay } from '@/lib/comments/order';
import { submitComment, likeComment } from '@/lib/api/client';
import { formatRelativeKo } from '@/lib/format';
import { getHeuristicRegion, requestRegionInteractive } from '@/lib/geo';
import { useToast } from '@/components/ui/toast';

const PAGE = 10;

export function CommentSection({
  marathonId,
  comments,
  onChanged,
  channel = 'voice',
  title = '시민들의 목소리',
  placeholder = '무기명으로 한마디 남겨주세요.',
  captureRegion = false,
  showRegion = false,
  requireLocation = false,
}: {
  marathonId: string;
  comments: CommentPublic[];
  onChanged: () => void;
  channel?: 'voice' | 'detour';
  title?: string;
  placeholder?: string;
  captureRegion?: boolean;
  showRegion?: boolean;
  /** true 면 위치 공유(권역 확인)한 사람만 작성 가능. */
  requireLocation?: boolean;
}) {
  const toast = useToast();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [liking, setLiking] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const [region, setRegion] = useState<string | null>(null);
  const [regionChecked, setRegionChecked] = useState(false);
  const [locating, setLocating] = useState(false);

  // requireLocation 이면 마운트 시 이미 허용된 권한으로 권역을 조용히 확인.
  useEffect(() => {
    if (!requireLocation) {
      setRegionChecked(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const r = await getHeuristicRegion();
      if (!cancelled) {
        setRegion(r);
        setRegionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requireLocation]);

  const scoped = comments.filter((c) => c.channel === channel);
  const ordered = orderCommentsForDisplay(scoped, { pageSize: 1000 });
  const shown = ordered.slice(0, visible);
  const canWrite = !requireLocation || Boolean(region);

  async function shareLocation() {
    setLocating(true);
    try {
      const r = await requestRegionInteractive();
      if (r) {
        setRegion(r);
        toast('success', `${r} 권역으로 확인되었습니다.`);
      } else {
        toast('error', '위치 권한이 필요합니다.');
      }
    } finally {
      setLocating(false);
    }
  }

  async function onLike(id: string) {
    setLiking(id);
    try {
      await likeComment(id);
      onChanged();
    } catch {
      // 중복 등 무시.
    } finally {
      setLiking(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text.length < LIMITS.commentMin) {
      toast('error', '내용을 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      let useRegion: string | null = region;
      if (!requireLocation) {
        useRegion = captureRegion ? await getHeuristicRegion() : null;
      }
      await submitComment({
        marathon_id: marathonId,
        body: text,
        channel,
        region: useRegion,
      });
      setBody('');
      toast('success', '등록되었습니다.');
      onChanged();
    } catch (err) {
      toast(
        'error',
        err instanceof Error ? err.message : '등록에 실패했습니다.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-xs text-muted">인기 + 최신순</span>
      </div>

      {/* 작성 영역: requireLocation 이면 위치 공유한 사람만 */}
      {requireLocation && regionChecked && !canWrite ? (
        <div className="glass mt-4 rounded-2xl p-5 text-center text-sm text-muted">
          위치를 공유하면 우회로 관련 내용을 공유할 수 있습니다.
          <div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={shareLocation}
              disabled={locating}
              className="mt-3 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg transition hover:shadow-glow disabled:opacity-50"
            >
              {locating ? '위치 확인 중…' : '위치 공유하기'}
            </motion.button>
          </div>
        </div>
      ) : requireLocation && !regionChecked ? (
        <p className="mt-4 text-sm text-muted">위치 확인 중…</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-4">
          {requireLocation && region ? (
            <p className="mb-2 text-xs text-accent">
              현재 위치: {region} 권역 · 비슷한 위치의 시민과 우회로를
              공유합니다
            </p>
          ) : null}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={LIMITS.commentMax}
            rows={3}
            placeholder={placeholder}
            className="w-full rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-fg placeholder:text-muted/50 transition focus:border-accent/50"
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.98 }}
            disabled={busy}
            className="mt-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg transition hover:shadow-glow disabled:opacity-50"
          >
            {busy
              ? '등록 중…'
              : channel === 'detour'
                ? '우회로 공유'
                : '댓글 남기기'}
          </motion.button>
        </form>
      )}

      <ul className="mt-5 space-y-2">
        {shown.length === 0 ? (
          <li className="glass rounded-2xl py-8 text-center text-sm text-muted">
            {channel === 'detour'
              ? '첫 우회로 정보를 공유해 주세요.'
              : '첫 번째 목소리를 남겨주세요.'}
          </li>
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((c) => (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="glass rounded-2xl p-4"
              >
                <p className="text-sm leading-relaxed">{c.body}</p>
                <div className="mt-2.5 flex items-center justify-between text-xs text-muted">
                  <span>
                    {showRegion && c.region ? `${c.region} · ` : ''}
                    {formatRelativeKo(c.created_at)}
                  </span>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    onClick={() => onLike(c.id)}
                    disabled={liking === c.id}
                    className="rounded-full border border-line px-3 py-1 transition hover:border-accent2/50 hover:text-accent2 disabled:opacity-50"
                  >
                    👍 {c.like_count}
                  </motion.button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        )}
      </ul>
      {ordered.length > visible ? (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE)}
          className="mt-3 w-full rounded-full border border-line py-2.5 text-sm text-muted transition hover:border-accent/40 hover:text-fg"
        >
          더보기 ({ordered.length - visible}개 더)
        </button>
      ) : null}
    </section>
  );
}
