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
  // 트래픽 스파이크 대응: 짧은 edge/CDN 캐시 + stale-while-revalidate.
  return NextResponse.json(summary, {
    headers: {
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
    },
  });
}
