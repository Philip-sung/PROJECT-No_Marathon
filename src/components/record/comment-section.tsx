'use client';

import { useState } from 'react';
import type { CommentPublic } from '@/lib/db/schema';
import { LIMITS } from '@/lib/db/constants';
import { orderCommentsForDisplay } from '@/lib/comments/order';
import { submitComment, likeComment } from '@/lib/api/client';

/**
 * 무기명 댓글 — 입력 + 목록(상위 20: 좋아요 top5 + 최신) + 좋아요.
 */
export function CommentSection({
  marathonId,
  comments,
  onChanged,
}: {
  marathonId: string;
  comments: CommentPublic[];
  onChanged: () => void;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liking, setLiking] = useState<string | null>(null);

  const ordered = orderCommentsForDisplay(comments);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const text = body.trim();
    if (text.length < LIMITS.commentMin) {
      setError('내용을 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      await submitComment({ marathon_id: marathonId, body: text });
      setBody('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다.');
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
      // 좋아요 실패는 조용히 무시(중복 등).
    } finally {
      setLiking(null);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-bold">시민들의 목소리</h2>
      <form onSubmit={onSubmit} className="mt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={LIMITS.commentMax}
          rows={3}
          placeholder="무기명으로 한마디 남겨주세요."
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        {error ? (
          <p className="mt-1 text-sm text-brand-accent">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {busy ? '등록 중…' : '댓글 남기기'}
        </button>
      </form>

      <ul className="mt-5 space-y-2">
        {ordered.length === 0 ? (
          <li className="py-6 text-center text-sm text-gray-400">
            첫 번째 목소리를 남겨주세요.
          </li>
        ) : (
          ordered.map((c) => (
            <li key={c.id} className="rounded-lg border border-gray-200 p-3">
              <p className="text-sm leading-relaxed">{c.body}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                <span>{c.created_at.slice(0, 10)}</span>
                <button
                  type="button"
                  onClick={() => onLike(c.id)}
                  disabled={liking === c.id}
                  className="rounded-full border border-gray-200 px-2 py-0.5 hover:bg-gray-50 disabled:opacity-50"
                >
                  👍 {c.like_count}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
