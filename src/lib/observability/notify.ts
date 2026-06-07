import 'server-only';
import { serverEnv } from '@/lib/env.server';
import { logger } from '@/lib/observability/logger';

/**
 * 알림/External Escalation(관측성 L3 + PDF §11.3).
 * 항상 구조적 로그를 남기고, SLACK_WEBHOOK_URL 이 있으면 Slack 으로도 전송.
 * 전송 실패가 본 흐름을 막지 않도록 안전 처리.
 */
export async function notify(input: {
  level: 'info' | 'warn' | 'error';
  title: string;
  detail: string;
  fields?: Record<string, unknown>;
}): Promise<void> {
  logger[input.level]('notify', {
    title: input.title,
    detail: input.detail,
    ...input.fields,
  });

  const url = serverEnv.SLACK_WEBHOOK_URL;
  if (!url) {
    return;
  }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: `[${input.level.toUpperCase()}] ${input.title}\n${input.detail}`,
      }),
    });
  } catch (err) {
    logger.error('notify_failed', {
      message: err instanceof Error ? err.message : 'unknown',
    });
  }
}
