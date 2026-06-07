import 'server-only';
import { callStructured } from '@/lib/agent/claude';
import { AGENT_CONFIG } from '@/lib/agent/config';
import {
  NormalizedMarathonSchema,
  type NormalizedMarathon,
  type Usage,
} from '@/lib/agent/types';
import type { ResearchTarget } from '@/lib/agent/targets';
import { MOCK_RESEARCH, MOCK_RESEARCH_FALLBACK } from '@/lib/mock/datasets';

/**
 * Worker(저비용 모델) — 한 타깃을 조사해 정형화된 마라톤 정보로 산출.
 * subagent = intelligent filter(PDF §7.2.3): 원문이 아닌 정형 결과만 반환.
 * mock 결과는 datasets(SSOT)에서 주입.
 */
const WORKER_SYSTEM =
  '당신은 한국 마라톤 교통통제 정보를 수집·정형화하는 보조자입니다. ' +
  '주어진 주제로 마라톤명, 날짜(YYYY-MM-DD), 영향 지역, 주최측 정보(이름/홈페이지/연락처/이메일), ' +
  '우회 안내(지하철/버스 목록)를 가능한 범위에서 채워 JSON 으로 정형화하세요. 불확실한 값은 null.';

export async function researchMarathon(
  target: ResearchTarget,
): Promise<{ data: NormalizedMarathon; usage: Usage }> {
  return callStructured({
    model: AGENT_CONFIG.workerModel,
    system: WORKER_SYSTEM,
    prompt: `다음 주제의 마라톤 정보를 정형화하세요: "${target.query}"`,
    schema: NormalizedMarathonSchema,
    maxTokens: AGENT_CONFIG.maxTokens,
    mock: () => MOCK_RESEARCH[target.key] ?? MOCK_RESEARCH_FALLBACK,
  });
}
