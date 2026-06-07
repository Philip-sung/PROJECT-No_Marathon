'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { submitDisruption } from '@/lib/api/client';
import { LIMITS } from '@/lib/db/constants';
import { useToast } from '@/components/ui/toast';

const inputCls =
  'mt-1 w-full rounded-xl border border-line bg-white/[0.03] px-4 py-2.5 text-fg placeholder:text-muted/50 transition focus:border-accent/50';

export function DisruptionForm({
  marathonId,
  onDone,
}: {
  marathonId: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const m = Number(minutes);
    if (!Number.isInteger(m) || m < LIMITS.disruptionMinMinutes) {
      toast('error', '허비한 시간을 분 단위로 입력해 주세요.');
      return;
    }
    if (m > LIMITS.disruptionMaxMinutes) {
      toast(
        'error',
        `최대 ${LIMITS.disruptionMaxMinutes}분까지 입력할 수 있습니다.`,
      );
      return;
    }
    if (
      m > LIMITS.disruptionSoftWarnMinutes &&
      !window.confirm(
        `${m}분(약 ${Math.round(m / 60)}시간)이 맞나요? 과장된 입력은 신뢰를 떨어뜨립니다.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await submitDisruption({
        marathon_id: marathonId,
        minutes_lost: m,
        note: note.trim() || null,
        display_name: displayName.trim() || null,
      });
      setMinutes('');
      setNote('');
      setDisplayName('');
      toast('success', '기록되었습니다. 감사합니다.');
      onDone();
    } catch (err) {
      toast(
        'error',
        err instanceof Error ? err.message : '입력에 실패했습니다.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass rounded-3xl p-6">
      <h3 className="text-lg font-bold">내 불편 기록하기</h3>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="block text-xs text-muted">허비한 시간(분)</span>
          <input
            type="number"
            inputMode="numeric"
            min={LIMITS.disruptionMinMinutes}
            max={LIMITS.disruptionMaxMinutes}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="예: 45"
            className={inputCls}
            required
          />
        </label>
        <label className="flex-1">
          <span className="block text-xs text-muted">표시 이름(선택)</span>
          <input
            type="text"
            maxLength={LIMITS.displayNameMax}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="예: 종로직장인"
            className={inputCls}
          />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="block text-xs text-muted">한 줄 상황(선택)</span>
        <input
          type="text"
          maxLength={LIMITS.noteMax}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예: 버스가 30분째 안 옴"
          className={inputCls}
        />
      </label>
      <motion.button
        type="submit"
        whileTap={{ scale: 0.98 }}
        disabled={busy}
        className="mt-4 w-full rounded-full bg-accent2 px-4 py-3 font-semibold text-white transition hover:shadow-glow-rose disabled:opacity-50"
      >
        {busy ? '기록 중…' : '기록하기'}
      </motion.button>
      <p className="mt-2 text-xs text-muted/70">
        본인인증 없이 기기 기준으로 1회만 집계됩니다(재입력 시 갱신).
      </p>
    </form>
  );
}
