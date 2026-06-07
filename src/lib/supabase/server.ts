import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env, isMock } from '@/lib/env';

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * 서버 컴포넌트/Route Handler 용 Supabase 클라이언트.
 * mock 모드에서는 null 을 반환하며, 호출부는 mock 데이터 경로로 분기한다.
 */
export async function createServerSupabase() {
  if (isMock) {
    return null;
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      'live 모드에는 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다.',
    );
  }
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set({ name, value, ...options });
            }
          } catch {
            // 서버 컴포넌트에서 set 호출 시 무시(미들웨어에서 갱신).
          }
        },
      },
    },
  );
}
