/**
 * 도메인 임계값 — DB CHECK 제약과 반드시 일치시킨다(이중 방어).
 * 과도입력 필터의 단일 출처(SSOT).
 */
export const LIMITS = {
  // 불편 시간(분). 하드 상한 480분(8h) = DB CHECK 와 동일.
  disruptionMinMinutes: 1,
  disruptionMaxMinutes: 480,
  // 소프트 경고(앱에서 "정말 4시간 이상?" 확인 유도, 차단 아님).
  disruptionSoftWarnMinutes: 240,
  noteMax: 500,
  displayNameMax: 40,
  commentMin: 1,
  commentMax: 1000,
  reportMin: 1,
  reportMax: 2000,
  contactMax: 200,
} as const;

/** 댓글 표시 규칙: 상위 20개(좋아요 top5 + 최신). */
export const COMMENT_DISPLAY = {
  pageSize: 20,
  topLiked: 5,
} as const;
