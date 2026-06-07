import { NextResponse } from 'next/server';
import { CommentInputSchema } from '@/lib/db/schema';
import { writeComment } from '@/lib/data/mutations';
import { deviceHashFromRequest } from '@/lib/identity/device';
import { rateLimitOr429 } from '@/lib/security/guard';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  const limited = rateLimitOr429(request, 'comments', RATE_LIMITS.comments);
  if (limited) {
    return limited;
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = CommentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '댓글 입력이 올바르지 않습니다.', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const deviceHash = deviceHashFromRequest(request.headers);
  await writeComment(parsed.data, deviceHash);
  return NextResponse.json({ ok: true });
}
