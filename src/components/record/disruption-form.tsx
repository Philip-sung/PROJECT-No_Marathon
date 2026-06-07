'use client';

import { useState } from 'react';
import { submitDisruption } from '@/lib/api/client';
import { LIMITS } from '@/lib/db/constants';

/**
 * 불편 시간 입력 폼. 분 단위 입력 + 한 줄 코멘트 + 표시이름(선택).
 * 과도입력: 서버가 1~480분 강제, 클라는 소프트 경고(240분 초과 시 확인).
 */
export function DisruptionForm({
  marathonId,
  onDone,
}: {
  marathonId: string;
  onDone: () => void;
}) {
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const m = Number(minutes);
    if (!Number.isInteger(m) || m < LIMITS.disruptionMinMinutes) {
      setError('허비한 시간을 분 단위로 입력해 주세요.');
      return;
    }
    if (m > LIMITS.disruptionMaxMinutes) {
      setError(`최대 ${LIMITS.disruptionMaxMinutes}분까지 입력할 수 있습니다.`);
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
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : '입력에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold">내 불편 기록하기</h3>
      <div className="mt-3 flex items-end gap-2">
        <label className="flex-1">
          <span className="block text-xs text-gray-500">허비한 시간(분)</span>
          <input
            type="number"
            inputMode="numeric"
            min={LIMITS.disruptionMinMinutes}
            max={LIMITS.disruptionMaxMinutes}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="예: 45"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            required
          />
        </label>
        <label className="flex-1">
          <span className="block text-xs text-gray-500">표시 이름(선택)</span>
          <input
            type="text"
            maxLength={LIMITS.displayNameMax}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="예: 종로직장인"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
      </div>
      <label className="mt-2 block">
        <span className="block text-xs text-gray-500">한 줄 상황(선택)</span>
        <input
          type="text"
          maxLength={LIMITS.noteMax}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예: 버스가 30분째 안 옴"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </label>
      {error ? <p className="mt-2 text-sm text-brand-accent">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-3 w-full rounded-lg bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {busy ? '기록 중…' : '기록하기'}
      </button>
      <p className="mt-2 text-xs text-gray-400">
        본인인증 없이 기기 기준으로 1회만 집계됩니다(재입력 시 갱신).
      </p>
    </form>
  );
}
