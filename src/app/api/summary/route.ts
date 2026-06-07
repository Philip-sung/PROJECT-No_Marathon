import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMarathonSummary } from '@/lib/data/summary';

export const dynamic = 'force-dynamic';

const QuerySchema = z.string().uuid();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse(searchParams.get('m'));
  if (!parsed.success) {
    return NextResponse.json(
      { error: '유효한 마라톤 id(m) 가 필요합니다.' },
      { status: 400 },
    );
  }
  const summary = await getMarathonSummary(parsed.data);
  return NextResponse.json(summary);
}
