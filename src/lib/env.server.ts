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
  // 수집 에이전트 트리거(cron/webhook) 인증 토큰.
  AGENT_TRIGGER_SECRET: z.string().optional().or(z.literal('')),
  // 알림/escalation 용 Slack incoming webhook(선택).
  SLACK_WEBHOOK_URL: z.string().optional().or(z.literal('')),
  // 간이 백오피스(/admin) 관리자 번호. 미설정 시 dev 에서만 무인증 허용.
  ADMIN_PASSCODE: z.string().optional().or(z.literal('')),
  // ── 수집 리포트 메일(네이버 SMTP) ──
  // send-naver-mail 스킬과 동일한 자격증명. 미설정 시 메일 발송은 조용히 생략.
  NAVER_MAIL_USER: z.string().optional().or(z.literal('')),
  NAVER_MAIL_APP_PASSWORD: z.string().optional().or(z.literal('')),
  // 수집 리포트 수신 주소. 미설정 시 NAVER_MAIL_USER 로 자기 자신에게 발송.
  COLLECTION_REPORT_EMAIL: z.string().email().optional().or(z.literal('')),
});

const parsed = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  REPORT_INBOX_EMAIL: process.env.REPORT_INBOX_EMAIL,
  DEVICE_HASH_SALT: process.env.DEVICE_HASH_SALT,
  AGENT_TRIGGER_SECRET: process.env.AGENT_TRIGGER_SECRET,
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  ADMIN_PASSCODE: process.env.ADMIN_PASSCODE,
  NAVER_MAIL_USER: process.env.NAVER_MAIL_USER,
  NAVER_MAIL_APP_PASSWORD: process.env.NAVER_MAIL_APP_PASSWORD,
  COLLECTION_REPORT_EMAIL: process.env.COLLECTION_REPORT_EMAIL,
});

if (!parsed.success) {
  throw new Error(
    `Invalid server environment variables:\n${parsed.error.toString()}`,
  );
}

export const serverEnv = parsed.data;
