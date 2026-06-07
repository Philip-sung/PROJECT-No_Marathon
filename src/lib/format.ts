/** 분(minutes)을 한국어 사람친화 표기로. 예: 255 → "4시간 15분". */
export function formatDurationKo(minutes: number): string {
  if (minutes <= 0) {
    return '0분';
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) {
    return `${m}분`;
  }
  if (m === 0) {
    return `${h}시간`;
  }
  return `${h}시간 ${m}분`;
}

/** 천 단위 구분 숫자. */
export function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}
