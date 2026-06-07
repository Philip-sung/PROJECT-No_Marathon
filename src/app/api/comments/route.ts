import { NextResponse } from 'next/server';
import { CommentInputSchema } from '@/lib/db/schema';
import { writeComment } from '@/lib/data/mutations';
import { deviceHashFromRequest } from '@/lib/identity/device';

export async function POST(request: Request) {
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
