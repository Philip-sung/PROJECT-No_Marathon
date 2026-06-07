import { z } from 'zod';
import {
  MarathonStatsSchema,
  DisruptionPublicSchema,
  CommentPublicSchema,
} from '@/lib/db/schema';

/** /record 페이지가 한 번에 읽는 묶음(집계 + 불편자 + 댓글). 클라/서버 공용. */
export const SummarySchema = z.object({
  stats: MarathonStatsSchema.nullable(),
  disruptions: DisruptionPublicSchema.array(),
  comments: CommentPublicSchema.array(),
});
export type Summary = z.infer<typeof SummarySchema>;
