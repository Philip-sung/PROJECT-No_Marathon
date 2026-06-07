import 'server-only';
import { serverEnv } from '@/lib/env.server';

/**
 * 간이 백오피스(/admin) 인증. ADMIN_PASSCODE 설정 시 x-admin-passcode 헤더 일치 필요.
 * 미설정(dev)이면 허용 — 로컬 개발 편의. 운영에서는 반드시 설정.
 */
export function isAdminAuthorized(headers: Headers): boolean {
  const code = serverEnv.ADMIN_PASSCODE;
  if (!code) {
    return true;
  }
  return headers.get('x-admin-passcode') === code;
}
