'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CommentPublic } from '@/lib/db/schema';
import { LIMITS } from '@/lib/db/constants';
import { orderCommentsForDisplay } from '@/lib/comments/order';
import { submitComment, likeComment } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';

export function CommentSection({
  marathonId,
  comments,
  onChanged,
}: {
  marathonId: string;
  comments: CommentPublic[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [liking, setLiking] = useState<string | null>(null);

  const ordered = orderCommentsForDisplay(comments);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text.length < LIMITS.commentMin) {
      toast('error', '내용을 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      await submitComment({ marathon_id: marathonId, body: text });
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
      <h2 className="text-lg font-bold">시민들의 목소리</h2>
      <form onSubmit={onSubmit} className="mt-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={LIMITS.commentMax}
          rows={3}
          placeholder="무기명으로 한마디 남겨주세요."
          className="w-full rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-fg placeholder:text-muted/50 transition focus:border-accent/50"
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={busy}
          className="mt-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg transition hover:shadow-glow disabled:opacity-50"
        >
          {busy ? '등록 중…' : '댓글 남기기'}
        </motion.button>
      </form>

      <ul className="mt-5 space-y-2">
        {ordered.length === 0 ? (
          <li className="glass rounded-2xl py-8 text-center text-sm text-muted">
            첫 번째 목소리를 남겨주세요.
          </li>
        ) : (
          <AnimatePresence initial={false}>
            {ordered.map((c) => (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-4"
              >
                <p className="text-sm leading-relaxed">{c.body}</p>
                <div className="mt-2.5 flex items-center justify-between text-xs text-muted">
                  <span>{c.created_at.slice(0, 10)}</span>
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
    </section>
  );
}
