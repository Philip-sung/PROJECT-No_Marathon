import { z } from 'zod';

/**
 * 클라이언트에서도 접근 가능한 공개 환경 변수(NEXT_PUBLIC_*).
 * CLAUDE.md [P1]: 타입 단언(as) 없이 Zod 파싱으로 타입 안전 확보.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_MODE: z.enum(['mock', 'live']).default('mock'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().or(z.literal('')),
  // AdSense 게시자 ID(ca-pub-...). 설정 시 실제 광고, 미설정 시 placeholder.
  NEXT_PUBLIC_ADSENSE_CLIENT: z.string().optional().or(z.literal('')),
  // AdSense 광고 단위 slot id(숫자). 디스플레이 단위 표시에 필요.
  NEXT_PUBLIC_ADSENSE_SLOT: z.string().optional().or(z.literal('')),
});

// Next.js는 NEXT_PUBLIC_* 를 빌드 타임에 인라인하므로 직접 참조해야 한다.
const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
  NEXT_PUBLIC_ADSENSE_SLOT: process.env.NEXT_PUBLIC_ADSENSE_SLOT,
});

if (!parsed.success) {
  // 잘못된 공개 환경 변수는 빌드/런타임 즉시 실패시켜 silent failure 방지.
  throw new Error(
    `Invalid public environment variables:\n${parsed.error.toString()}`,
  );
}

export const env = parsed.data;

export const isMock = env.NEXT_PUBLIC_APP_MODE === 'mock';
export const isLive = env.NEXT_PUBLIC_APP_MODE === 'live';
