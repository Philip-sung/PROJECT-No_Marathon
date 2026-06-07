import { createBrowserClient } from '@supabase/ssr';
import { env, isMock } from '@/lib/env';

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
 * mock 모드에서는 null 을 반환하며, 호출부는 mock 데이터 경로로 분기한다.
 */
export function createClient() {
  if (isMock) {
    return null;
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      'live 모드에는 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다.',
    );
  }
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
