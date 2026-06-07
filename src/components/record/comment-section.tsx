'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CommentPublic } from '@/lib/db/schema';
import { LIMITS } from '@/lib/db/constants';
import { orderCommentsForDisplay } from '@/lib/comments/order';
import { submitComment, likeComment } from '@/lib/api/client';
import { formatRelativeKo } from '@/lib/format';
import { getHeuristicRegion } from '@/lib/geo';
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
}: {
  marathonId: string;
  comments: CommentPublic[];
  onChanged: () => void;
  channel?: 'voice' | 'detour';
  title?: string;
  placeholder?: string;
  captureRegion?: boolean;
  showRegion?: boolean;
}) {
  const toast = useToast();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [liking, setLiking] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);

  const scoped = comments.filter((c) => c.channel === channel);
  const ordered = orderCommentsForDisplay(scoped, { pageSize: 1000 });
  const shown = ordered.slice(0, visible);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text.length < LIMITS.commentMin) {
      toast('error', '내용을 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      const region = captureRegion ? await getHeuristicRegion() : null;
      await submitComment({
        marathon_id: marathonId,
        body: text,
        channel,
        region,
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

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-xs text-muted">인기 + 최신순</span>
      </div>
      <form onSubmit={onSubmit} className="mt-4">
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
        {captureRegion ? (
          <p className="mt-1.5 text-xs text-muted/70">
            위치 권한을 허용하면 대략적인 위치가 함께 표시됩니다(선택).
          </p>
        ) : null}
      </form>

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
