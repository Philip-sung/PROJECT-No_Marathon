import 'server-only';
import { z } from 'zod';
import { isMock } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
import type { Usage } from '@/lib/agent/types';

/**
 * Claude 구조적 호출 래퍼. mock 모드면 결정론적 canned 값(외부호출 없음),
 * live 모드면 Anthropic Messages API 호출 후 JSON 을 Zod 로 검증.
 * tool description engineering 원칙: 호출부가 자족적 system/prompt 를 제공.
 */
interface CallStructuredOpts<S extends z.ZodTypeAny> {
  model: string;
  system: string;
  prompt: string;
  schema: S;
  maxTokens: number;
  /** mock 모드에서 반환할 결정론적 값 생성기. */
  mock: () => z.infer<S>;
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const MessagesResponseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  usage: z.object({
    input_tokens: z.number(),
    output_tokens: z.number(),
  }),
});

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('응답에서 JSON 을 찾지 못했습니다.');
  }
  return JSON.parse(raw.slice(start, end + 1));
}

export async function callStructured<S extends z.ZodTypeAny>(
  opts: CallStructuredOpts<S>,
): Promise<{ data: z.infer<S>; usage: Usage }> {
  if (isMock) {
    return {
      data: opts.schema.parse(opts.mock()),
      usage: { input_tokens: 400, output_tokens: 150 },
    };
  }

  if (!serverEnv.ANTHROPIC_API_KEY) {
    throw new Error('live 모드 수집에는 ANTHROPIC_API_KEY 가 필요합니다.');
  }

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': serverEnv.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: `${opts.system}\n\n반드시 유효한 JSON 객체 하나만 출력하세요. 설명/문장 금지.`,
      messages: [{ role: 'user', content: opts.prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API 오류: ${res.status}`);
  }

  const json: unknown = await res.json();
  const envelope = MessagesResponseSchema.parse(json);
  const text = envelope.content
    .map((c) => c.text ?? '')
    .join('')
    .trim();

  const data = opts.schema.parse(extractJson(text));
  return {
    data,
    usage: {
      input_tokens: envelope.usage.input_tokens,
      output_tokens: envelope.usage.output_tokens,
    },
  };
}
