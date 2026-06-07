'use client';

import { useState } from 'react';
import { LIMITS } from '@/lib/db/constants';
import { submitReport } from '@/lib/api/client';

/**
 * 앱 불편신고 — 개발자에게 전달(수신 메일은 서버 secret).
 */
export function ReportForm() {
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const text = body.trim();
    if (text.length < LIMITS.reportMin) {
      setError('내용을 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      await submitReport({ body: text, contact: contact.trim() || null });
      setBody('');
      setContact('');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '접수에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
        접수되었습니다. 감사합니다.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold">앱 불편 신고</h3>
      <p className="mt-1 text-xs text-gray-500">
        오류·개선 의견을 개발자에게 전달합니다.
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={LIMITS.reportMax}
        rows={2}
        placeholder="무엇이 불편했나요?"
        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        type="text"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        maxLength={LIMITS.contactMax}
        placeholder="회신 받을 연락처(선택)"
        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      {error ? <p className="mt-1 text-sm text-brand-accent">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {busy ? '접수 중…' : '신고 보내기'}
      </button>
    </form>
  );
}
