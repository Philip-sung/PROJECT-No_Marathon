import type { Marathon } from '@/lib/db/schema';

/**
 * 현재 시간/위치 기준 가장 가까운 마라톤 선택(순수 함수, 테스트 가능).
 * 우선순위: ① 진행 중 ② 시간상 가까움(일수) ③ 거리(좌표 있을 때).
 * prompt.md §02: 당 시각에 열리는 마라톤은 적으므로 최근접 자동선택.
 */
export interface NearestInput {
  now: Date;
  lat?: number | null;
  lng?: number | null;
}

const KST_OFFSET = '+09:00';

function toDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00${KST_OFFSET}`);
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pickNearestMarathonId(
  marathons: readonly Marathon[],
  input: NearestInput,
): string | null {
  if (marathons.length === 0) {
    return null;
  }
  const hasLocation =
    typeof input.lat === 'number' && typeof input.lng === 'number';

  const scored = marathons.map((m) => {
    const date = toDate(m.event_date);
    const start = m.start_time ? new Date(m.start_time) : date;
    const end = m.end_time ? new Date(m.end_time) : date;
    const ongoing = input.now >= start && input.now <= end;
    const dateDiffMs = Math.abs(date.getTime() - input.now.getTime());
    let dist = Number.POSITIVE_INFINITY;
    if (hasLocation && typeof m.lat === 'number' && typeof m.lng === 'number') {
      dist = haversineKm(
        { lat: input.lat ?? 0, lng: input.lng ?? 0 },
        { lat: m.lat, lng: m.lng },
      );
    }
    return { id: m.id, ongoing, dateDiffMs, dist };
  });

  scored.sort((a, b) => {
    if (a.ongoing !== b.ongoing) {
      return a.ongoing ? -1 : 1;
    }
    if (a.dateDiffMs !== b.dateDiffMs) {
      return a.dateDiffMs - b.dateDiffMs;
    }
    return a.dist - b.dist;
  });

  return scored[0]?.id ?? null;
}
