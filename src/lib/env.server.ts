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
});

const parsed = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  REPORT_INBOX_EMAIL: process.env.REPORT_INBOX_EMAIL,
});

if (!parsed.success) {
  throw new Error(
    `Invalid server environment variables:\n${parsed.error.toString()}`,
  );
}

export const serverEnv = parsed.data;
