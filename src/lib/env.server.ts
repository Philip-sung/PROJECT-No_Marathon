import 'server-only';
import { z } from 'zod';

/**
 * 서버 전용 환경 변수. 절대 클라이언트로 노출되지 않는다(server-only 가드).
 * mock 모드에서는 secret 없이 동작하도록 모두 optional.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal('')),
  ANTHROPIC_API_KEY: z.string().optional().or(z.literal('')),
  REPORT_INBOX_EMAIL: z.string().email().optional().or(z.literal('')),
  // 기기 해시 salt(익명 식별 안정화). 미설정 시 개발용 기본값 사용.
  DEVICE_HASH_SALT: z.string().optional().or(z.literal('')),
});

const parsed = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  REPORT_INBOX_EMAIL: process.env.REPORT_INBOX_EMAIL,
  DEVICE_HASH_SALT: process.env.DEVICE_HASH_SALT,
});

if (!parsed.success) {
  throw new Error(
    `Invalid server environment variables:\n${parsed.error.toString()}`,
  );
}

export const serverEnv = parsed.data;
