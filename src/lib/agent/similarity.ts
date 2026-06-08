import 'server-only';

/**
 * 마라톤 중복 판정용 제목 유사도 — **결정론 script(AI 아님)**.
 * 정책: 날짜가 같고 + 제목 유사도가 임계(기본 0.8) 이상이면 사실상 같은 대회.
 * 예) "2026 서울런 평화대회" ≈ "2026 서울런"(같은 날짜) → 같은 객체로 보고 중복 제거.
 *
 * 유사도 = 정규화(공백·구두점 제거, 소문자) 후 한쪽이 다른 쪽을 포함하면 1.0
 *          (접두/접미 변형 흡수), 그 외엔 문자 bigram Dice 계수.
 */
export function normalizeTitle(s: string): string {
  // 문자(\p{L})·숫자(\p{N}) 외 — 공백·구두점·중점(·)·기호 — 전부 제거 후 소문자.
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i += 1) {
    set.add(s.slice(i, i + 2));
  }
  return set;
}

/** 0~1. 정규화 후 포함관계면 1.0, 그 외엔 문자 bigram Dice 계수. */
export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) {
    return 0;
  }
  if (na === nb || na.includes(nb) || nb.includes(na)) {
    return 1;
  }
  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (ba.size === 0 || bb.size === 0) {
    return 0;
  }
  let inter = 0;
  for (const g of ba) {
    if (bb.has(g)) {
      inter += 1;
    }
  }
  return (2 * inter) / (ba.size + bb.size);
}

export interface MarathonKey {
  name: string;
  event_date: string;
}

/** 날짜가 동일하고 제목 유사도가 임계 이상이면 같은 대회로 판정. */
export function isSameMarathon(
  a: MarathonKey,
  b: MarathonKey,
  threshold: number,
): boolean {
  if (a.event_date !== b.event_date) {
    return false;
  }
  return titleSimilarity(a.name, b.name) >= threshold;
}
