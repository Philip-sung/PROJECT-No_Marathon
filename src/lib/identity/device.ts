import 'server-only';
import { createHash } from 'node:crypto';
import { serverEnv } from '@/lib/env.server';

/**
 * 기기 기준 익명 식별 — 본인인증 없이 휴리스틱 1인 1회.
 * IP + User-Agent (+ 선택적 클라이언트 핑거프린트) 를 salt 와 함께 해시.
 * 완전 차단이 아닌 통상적 중복 억제용(prompt.md §01-2).
 *
 * 주의: device_hash 는 절대 클라이언트로 노출하지 않는다(공개 뷰에서 제외됨).
 */
const DEV_FALLBACK_SALT = 'no-marathon-dev-salt';

export interface DeviceSignal {
  ip: string | null;
  userAgent: string | null;
  fingerprint?: string | null;
}

export function computeDeviceHash(signal: DeviceSignal): string {
  const salt = serverEnv.DEVICE_HASH_SALT || DEV_FALLBACK_SALT;
  const ip = signal.ip ?? 'unknown-ip';
  const ua = signal.userAgent ?? 'unknown-ua';
  const fp = signal.fingerprint ?? '';
  return createHash('sha256').update(`${salt}|${ip}|${ua}|${fp}`).digest('hex');
}

/**
 * 요청 헤더에서 클라이언트 IP 추출(프록시/Vultr 환경 대비).
 * x-forwarded-for 의 첫 항목 우선.
 */
export function extractClientIp(headers: Headers): string | null {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  return headers.get('x-real-ip');
}
