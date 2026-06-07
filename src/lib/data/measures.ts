import { z } from 'zod';
import { isMock } from '@/lib/env';

/**
 * "여론 기반 대책" — 취지 페이지에 노출되는 요구 대책.
 * 현재는 정적 초안(여론/뉴스 댓글 기반). Phase 7 수집 에이전트가
 * 이 accessor 를 통해 DB/AI 결과로 교체할 수 있도록 seam 으로 둔다.
 */
export const MeasureSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  source_hint: z.string().nullable(),
});
export type Measure = z.infer<typeof MeasureSchema>;

const DRAFT_MEASURES: readonly Measure[] = [
  {
    id: 'notice',
    title: '사전 공지 강화',
    description:
      '통제 구간·시간을 최소 1주 전, 지도앱·문자·현장 안내 등 다채널로 충분히 알릴 것.',
    source_hint: '뉴스 댓글·여론 기반(초안)',
  },
  {
    id: 'detour',
    title: '실시간 우회 안내',
    description:
      '통제 시간 동안 대체 버스 노선·지하철 이용법을 현장과 온라인에 함께 게시할 것.',
    source_hint: '뉴스 댓글·여론 기반(초안)',
  },
  {
    id: 'quota',
    title: '도심 주말 허가 총량·분산',
    description:
      '도심 주말에 집중되는 마라톤 허가의 총량을 관리하고 요일·지역을 분산할 것.',
    source_hint: '뉴스 댓글·여론 기반(초안)',
  },
  {
    id: 'emergency',
    title: '긴급차량·대중교통 통로 확보',
    description:
      '통제 구간 안에서도 응급차량과 노선버스가 지날 수 있는 우선 통로를 보장할 것.',
    source_hint: '뉴스 댓글·여론 기반(초안)',
  },
  {
    id: 'impact',
    title: '교통량 영향 사전 분석·공개',
    description:
      '허가 전 교통량 영향을 분석하고, 그 결과를 시민이 볼 수 있게 공개할 것.',
    source_hint: '뉴스 댓글·여론 기반(초안)',
  },
];

export async function getMeasures(): Promise<Measure[]> {
  // 현재는 mock/live 무관 정적. Phase 7 에서 live 분기 추가 예정.
  void isMock;
  return [...DRAFT_MEASURES];
}
