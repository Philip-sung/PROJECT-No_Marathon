import 'server-only';
import { z } from 'zod';
import { isMock } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
import { AGENT_CONFIG } from '@/lib/agent/config';
import type { Usage } from '@/lib/agent/types';

/**
 * Claude 구조적 호출 래퍼. mock 모드면 결정론적 canned 값(외부호출 없음),
 * live 모드면 Anthropic Messages API 호출 후 JSON 을 Zod 로 검증.
 * tools 를 주면 서버사이드 도구(web_search 등)를 사용하며, 서버 루프가
 * pause_turn 으로 멈추면 assistant 응답을 되돌려 보내 재개한다.
 */
interface CallStructuredOpts<S extends z.ZodTypeAny> {
  model: string;
  system: string;
  prompt: string;
  schema: S;
  maxTokens: number;
  /** 서버사이드 도구(예: web_search). live 에서만 사용. */
  tools?: unknown[];
  /** mock 모드에서 반환할 결정론적 값 생성기. */
  mock: () => z.infer<S>;
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// content 블록은 type/text 외 필드(server_tool_use 등)를 보존해야 재전송 가능.
const BlockSchema = z
  .object({ type: z.string(), text: z.string().optional() })
  .passthrough();
const MessagesResponseSchema = z.object({
  stop_reason: z.string().nullable().optional(),
  content: z.array(BlockSchema),
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

  // 프롬프트 캐싱: 시스템 프롬프트는 타깃마다 동일하므로 캐시(반복 호출 시 입력 ~0.1x).
  const system = [
    {
      type: 'text',
      text: `${opts.system}\n\n작업이 끝나면 반드시 유효한 JSON 객체 하나만 출력하세요. 그 외 설명/문장 금지.`,
      cache_control: { type: 'ephemeral' },
    },
  ];

  const messages: { role: 'user' | 'assistant'; content: unknown }[] = [
    { role: 'user', content: opts.prompt },
  ];
  const usage: Usage = { input_tokens: 0, output_tokens: 0 };
  let finalText = '';

  for (let i = 0; i < AGENT_CONFIG.maxContinuations; i += 1) {
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
        system,
        messages,
        ...(opts.tools ? { tools: opts.tools } : {}),
      }),
    });

    if (!res.ok) {
      // 에러 본문까지 surface — 400 등 원인 진단·메일 보고용(status 만으론 알 수 없음).
      const body = await res.text().catch(() => '');
      throw new Error(
        `Anthropic API 오류: ${res.status}${body ? ` — ${body.slice(0, 400)}` : ''}`,
      );
    }

    const json: unknown = await res.json();
    const envelope = MessagesResponseSchema.parse(json);
    usage.input_tokens += envelope.usage.input_tokens;
    usage.output_tokens += envelope.usage.output_tokens;
    finalText = envelope.content
      .map((c) => c.text ?? '')
      .join('')
      .trim();

    // 서버 도구 루프가 멈춤(pause_turn) → assistant 응답을 되돌려 재개.
    // 단 누적 입력 토큰이 상한을 넘으면 폭주 방지를 위해 더 재개하지 않고 중단.
    if (
      envelope.stop_reason === 'pause_turn' &&
      usage.input_tokens < AGENT_CONFIG.maxInputTokensPerCall
    ) {
      // 마지막 블록에 캐시 breakpoint — 커지는 대화 prefix(거대한 검색결과 포함)를
      // 캐시해 다음 재개 호출의 재전송 비용을 ~0.1x 로 낮춘다.
      const content = envelope.content.map((b, idx) =>
        idx === envelope.content.length - 1
          ? { ...b, cache_control: { type: 'ephemeral' } }
          : b,
      );
      messages.push({ role: 'assistant', content });
      continue;
    }
    break;
  }

  return { data: opts.schema.parse(extractJson(finalText)), usage };
}
