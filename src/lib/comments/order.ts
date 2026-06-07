import type { CommentPublic } from '@/lib/db/schema';
import { COMMENT_DISPLAY } from '@/lib/db/constants';

/**
 * 댓글 표시 순서(순수 함수): 상위 N개(기본 20).
 * 좋아요 top K(기본 5) 먼저, 나머지는 최신순. 중복 없이 최대 N개.
 * prompt.md §01-2.
 */
export function orderCommentsForDisplay(
  comments: readonly CommentPublic[],
  opts: { pageSize?: number; topLiked?: number } = {},
): CommentPublic[] {
  const pageSize = opts.pageSize ?? COMMENT_DISPLAY.pageSize;
  const topLiked = opts.topLiked ?? COMMENT_DISPLAY.topLiked;

  const byLikes = [...comments].sort((a, b) => {
    if (b.like_count !== a.like_count) {
      return b.like_count - a.like_count;
    }
    return b.created_at.localeCompare(a.created_at);
  });
  // 좋아요가 0인 댓글은 top 영역에서 제외(의미 있는 인기글만).
  const top = byLikes.filter((c) => c.like_count > 0).slice(0, topLiked);
  const topIds = new Set(top.map((c) => c.id));

  const rest = [...comments]
    .filter((c) => !topIds.has(c.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return [...top, ...rest].slice(0, pageSize);
}
