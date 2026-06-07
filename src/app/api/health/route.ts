import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** 헬스체크(관측성). 외부 모니터/로드밸런서용. */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    mode: env.NEXT_PUBLIC_APP_MODE,
    time: new Date().toISOString(),
  });
}
