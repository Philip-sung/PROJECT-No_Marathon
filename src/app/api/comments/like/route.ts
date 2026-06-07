import { NextResponse } from 'next/server';
import { z } from 'zod';
import { writeLike } from '@/lib/data/mutations';
import { deviceHashFromRequest } from '@/lib/identity/device';
import { rateLimitOr429 } from '@/lib/security/guard';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

const LikeSchema = z.object({ comment_id: z.string() });

export async function POST(request: Request) {
  const limited = rateLimitOr429(request, 'like', RATE_LIMITS.like);
  if (limited) {
    return limited;
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = LikeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'comment_id 가 필요합니다.' },
      { status: 400 },
    );
  }
  const deviceHash = deviceHashFromRequest(request.headers);
  await writeLike(parsed.data.comment_id, deviceHash);
  return NextResponse.json({ ok: true });
}
