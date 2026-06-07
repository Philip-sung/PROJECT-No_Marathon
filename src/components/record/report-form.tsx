'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LIMITS } from '@/lib/db/constants';
import { submitReport } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';

const inputCls =
  'mt-2 w-full rounded-xl border border-line bg-white/[0.03] px-4 py-2.5 text-sm text-fg placeholder:text-muted/50 transition focus:border-accent/50';

export function ReportForm() {
  const toast = useToast();
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text.length < LIMITS.reportMin) {
      toast('error', '내용을 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      await submitReport({ body: text, contact: contact.trim() || null });
      setBody('');
      setContact('');
      setDone(true);
      toast('success', '접수되었습니다. 감사합니다.');
    } catch (err) {
      toast(
        'error',
        err instanceof Error ? err.message : '접수에 실패했습니다.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="glass rounded-2xl p-5 text-sm text-muted">
        접수되었습니다. 감사합니다.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass rounded-2xl p-5">
      <h3 className="text-sm font-bold">앱 불편 신고</h3>
      <p className="mt-1 text-xs text-muted">
        오류·개선 의견을 개발자에게 전달합니다.
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={LIMITS.reportMax}
        rows={2}
        placeholder="무엇이 불편했나요?"
        className={inputCls}
      />
      <input
        type="text"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        maxLength={LIMITS.contactMax}
        placeholder="회신 받을 연락처(선택)"
        className={inputCls}
      />
      <motion.button
        type="submit"
        whileTap={{ scale: 0.98 }}
        disabled={busy}
        className="mt-3 rounded-full border border-line px-5 py-2 text-sm font-semibold transition hover:border-accent/50 disabled:opacity-50"
      >
        {busy ? '접수 중…' : '신고 보내기'}
      </motion.button>
    </form>
  );
}
