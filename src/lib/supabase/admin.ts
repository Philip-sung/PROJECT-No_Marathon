import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env, isMock } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';

/**
 * service_role 클라이언트 — RLS 를 우회하는 서버 전용 쓰기/관리용(ADR-007).
 * 절대 클라이언트로 노출 금지. mock 모드면 null.
 */
export function createAdminSupabase() {
  if (isMock) {
    return null;
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'live 모드 쓰기에는 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.',
    );
  }
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}
