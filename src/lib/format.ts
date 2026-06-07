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

/** ISO 시각을 상대시간으로. 예: "방금 전", "5분 전", "3시간 전", "2일 전", 그 이상은 날짜. */
export function formatRelativeKo(
  iso: string,
  now: number = Date.now(),
): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) {
    return '';
  }
  const diffSec = Math.floor((now - t) / 1000);
  if (diffSec < 30) {
    return '방금 전';
  }
  if (diffSec < 60) {
    return `${diffSec}초 전`;
  }
  const min = Math.floor(diffSec / 60);
  if (min < 60) {
    return `${min}분 전`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return `${hr}시간 전`;
  }
  const day = Math.floor(hr / 24);
  if (day < 7) {
    return `${day}일 전`;
  }
  return iso.slice(0, 10);
}
