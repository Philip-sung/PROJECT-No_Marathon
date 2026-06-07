import { NextResponse } from 'next/server';
import { ReportInputSchema } from '@/lib/db/schema';
import { writeReport } from '@/lib/data/mutations';
import { deviceHashFromRequest } from '@/lib/identity/device';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = ReportInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '신고 내용이 올바르지 않습니다.', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const deviceHash = deviceHashFromRequest(request.headers);
  await writeReport(parsed.data, deviceHash);
  return NextResponse.json({ ok: true });
}
