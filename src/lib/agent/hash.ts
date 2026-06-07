import 'server-only';
import { createHash } from 'node:crypto';
import type { NormalizedMarathon } from '@/lib/agent/types';

/**
 * content_hash — 정형화 결과의 의미적 지문(중복 수집 회피, L2).
 * 핵심 식별/내용 필드만 정규화해 해시. 동일 내용이면 재등록하지 않는다.
 */
export function contentHash(m: NormalizedMarathon): string {
  const canonical = JSON.stringify({
    name: m.name.trim(),
    event_date: m.event_date,
    area: m.area.trim(),
    organizer_name: m.organizer_name ?? null,
    organizer_url: m.organizer_url ?? null,
    organizer_email: m.organizer_email ?? null,
    detour: {
      subway: [...m.detour_info.subway].sort(),
      bus: [...m.detour_info.bus].sort(),
    },
  });
  return createHash('sha256').update(canonical).digest('hex');
}
