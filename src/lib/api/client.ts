'use client';

import { SummarySchema, type Summary } from '@/lib/api/types';
import type {
  DisruptionInput,
  CommentInput,
  ReportInput,
} from '@/lib/db/schema';

/**
 * 클라이언트 API 래퍼. 모든 요청에 x-device-fp(로컬 저장 난수)를 실어
 * 1인 1회 휴리스틱을 강화한다(서버가 IP/UA 와 함께 해시).
 */
const FP_KEY = 'nm_fp';

function getFingerprint(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  let fp = window.localStorage.getItem(FP_KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    window.localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-device-fp': getFingerprint(),
  };
}

async function postJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null);
    const message =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : '요청 처리에 실패했습니다.';
    throw new Error(message);
  }
}

export async function fetchSummary(marathonId: string): Promise<Summary> {
  const res = await fetch(`/api/summary?m=${encodeURIComponent(marathonId)}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('데이터를 불러오지 못했습니다.');
  }
  const data: unknown = await res.json();
  return SummarySchema.parse(data);
}

export function submitDisruption(input: DisruptionInput): Promise<void> {
  return postJson('/api/disruptions', input);
}

export function submitComment(input: CommentInput): Promise<void> {
  return postJson('/api/comments', input);
}

export function likeComment(commentId: string): Promise<void> {
  return postJson('/api/comments/like', { comment_id: commentId });
}

export function submitReport(input: ReportInput): Promise<void> {
  return postJson('/api/reports', input);
}
