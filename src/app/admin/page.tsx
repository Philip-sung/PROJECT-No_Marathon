'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { AdminMarathonSchema, type AdminMarathon } from '@/lib/db/schema';
import { useToast } from '@/components/ui/toast';

const ListResponseSchema = z.object({ marathons: AdminMarathonSchema.array() });

const inputCls =
  'mt-1 w-full rounded-lg border border-line bg-white/[0.03] px-3 py-2 text-sm text-fg placeholder:text-muted/40 focus:border-accent/50';

function parseNum(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function AdminPage() {
  const toast = useToast();
  const [passcode, setPasscode] = useState('');
  const [authed, setAuthed] = useState(false);
  const [list, setList] = useState<AdminMarathon[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadList(code: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/marathons', {
        headers: { 'x-admin-passcode': code },
        cache: 'no-store',
      });
      if (res.status === 401) {
        toast('error', '관리자 번호가 올바르지 않습니다.');
        return false;
      }
      if (!res.ok) {
        toast('error', '목록을 불러오지 못했습니다.');
        return false;
      }
      const data: unknown = await res.json();
      const parsed = ListResponseSchema.safeParse(data);
      setList(parsed.success ? parsed.data.marathons : []);
      return true;
    } finally {
      setLoading(false);
    }
  }

  async function onEnter(e: React.FormEvent) {
    e.preventDefault();
    const ok = await loadList(passcode);
    if (ok) {
      setAuthed(true);
    }
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-sm px-6 py-24">
        <h1 className="text-2xl font-bold">관리자</h1>
        <p className="mt-2 text-sm text-muted">
          정보 관리(간이 백오피스) — 관리자 번호를 입력하세요.
        </p>
        <form onSubmit={onEnter} className="mt-6">
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="관리자 번호"
            className={inputCls}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full rounded-full bg-accent px-4 py-2.5 font-semibold text-bg transition hover:shadow-glow disabled:opacity-50"
          >
            {loading ? '확인 중…' : '입력'}
          </button>
        </form>
        <p className="mt-3 text-xs text-muted/60">
          dev(미설정) 환경에서는 아무 값이나 입력해도 됩니다.
        </p>
      </main>
    );
  }

  const staging = list.filter((m) => m.status === 'staging');
  const others = list.filter((m) => m.status !== 'staging');

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">정보 관리</h1>
        <button
          type="button"
          onClick={() => loadList(passcode)}
          className="rounded-full border border-line px-4 py-1.5 text-sm text-muted hover:text-fg"
        >
          새로고침
        </button>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-accent2">
          검수 대기 (staging) · {staging.length}
        </h2>
        <div className="mt-3 space-y-4">
          {staging.length === 0 ? (
            <p className="text-sm text-muted">대기 중인 항목이 없습니다.</p>
          ) : (
            staging.map((m) => (
              <AdminCard
                key={m.id}
                marathon={m}
                passcode={passcode}
                onSaved={() => loadList(passcode)}
              />
            ))
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-bold text-muted">
          게시/보관 (published/archived) · {others.length}
        </h2>
        <div className="mt-3 space-y-4">
          {others.map((m) => (
            <AdminCard
              key={m.id}
              marathon={m}
              passcode={passcode}
              onSaved={() => loadList(passcode)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function AdminCard({
  marathon,
  passcode,
  onSaved,
}: {
  marathon: AdminMarathon;
  passcode: string;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(marathon.name);
  const [eventDate, setEventDate] = useState(marathon.event_date);
  const [area, setArea] = useState(marathon.area);
  const [startTime, setStartTime] = useState(marathon.start_time ?? '');
  const [endTime, setEndTime] = useState(marathon.end_time ?? '');
  const [lat, setLat] = useState(marathon.lat?.toString() ?? '');
  const [lng, setLng] = useState(marathon.lng?.toString() ?? '');
  const [orgName, setOrgName] = useState(marathon.organizer_name ?? '');
  const [orgUrl, setOrgUrl] = useState(marathon.organizer_url ?? '');
  const [orgContact, setOrgContact] = useState(
    marathon.organizer_contact ?? '',
  );
  const [orgEmail, setOrgEmail] = useState(marathon.organizer_email ?? '');
  const [detourText, setDetourText] = useState(
    JSON.stringify(marathon.detour_info, null, 2),
  );
  const [zoneText, setZoneText] = useState(
    JSON.stringify(marathon.control_zone, null, 2),
  );
  const [status, setStatus] = useState(marathon.status);
  const [busy, setBusy] = useState(false);

  async function save(overrideStatus?: AdminMarathon['status']) {
    let detour_info: Record<string, unknown>;
    let control_zone: Record<string, unknown>;
    try {
      detour_info = JSON.parse(detourText || '{}');
      control_zone = JSON.parse(zoneText || '{}');
    } catch {
      toast('error', 'detour_info/control_zone JSON 형식을 확인하세요.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/marathons/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode,
        },
        body: JSON.stringify({
          id: marathon.id,
          patch: {
            name,
            event_date: eventDate,
            area,
            start_time: startTime || null,
            end_time: endTime || null,
            lat: parseNum(lat),
            lng: parseNum(lng),
            organizer_name: orgName || null,
            organizer_url: orgUrl || null,
            organizer_contact: orgContact || null,
            organizer_email: orgEmail || null,
            detour_info,
            control_zone,
            status: overrideStatus ?? status,
          },
        }),
      });
      if (!res.ok) {
        toast('error', '저장에 실패했습니다.');
        return;
      }
      toast('success', '저장되었습니다.');
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div layout className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted">
          {marathon.status} · {marathon.source ?? '-'}
        </span>
        <span className="text-xs text-muted/50">{marathon.id.slice(0, 8)}</span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted">
          이름
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          날짜(YYYY-MM-DD)
          <input
            className={inputCls}
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted sm:col-span-2">
          영향 지역
          <input
            className={inputCls}
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          통제 시작(ISO)
          <input
            className={inputCls}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            placeholder="2026-04-19T07:00:00+09:00"
          />
        </label>
        <label className="text-xs text-muted">
          통제 종료(ISO)
          <input
            className={inputCls}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          위도(lat)
          <input
            className={inputCls}
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          경도(lng)
          <input
            className={inputCls}
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          주최 이름
          <input
            className={inputCls}
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          주최 홈페이지
          <input
            className={inputCls}
            value={orgUrl}
            onChange={(e) => setOrgUrl(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          주최 연락처
          <input
            className={inputCls}
            value={orgContact}
            onChange={(e) => setOrgContact(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          주최 이메일
          <input
            className={inputCls}
            value={orgEmail}
            onChange={(e) => setOrgEmail(e.target.value)}
          />
        </label>
      </div>

      <label className="mt-2 block text-xs text-muted">
        우회 안내(detour_info, JSON)
        <textarea
          className={`${inputCls} font-mono`}
          rows={3}
          value={detourText}
          onChange={(e) => setDetourText(e.target.value)}
        />
      </label>
      <label className="mt-2 block text-xs text-muted">
        통제구간(control_zone, JSON)
        <textarea
          className={`${inputCls} font-mono`}
          rows={3}
          value={zoneText}
          onChange={(e) => setZoneText(e.target.value)}
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted">
          상태
          <select
            className={`${inputCls} w-auto`}
            value={status}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'staging' || v === 'published' || v === 'archived') {
                setStatus(v);
              }
            }}
          >
            <option value="staging">staging</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => save()}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:shadow-glow disabled:opacity-50"
        >
          {busy ? '저장 중…' : '저장'}
        </button>
        {marathon.status !== 'published' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => save('published')}
            className="rounded-full border border-accent/50 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/10 disabled:opacity-50"
          >
            게시(published)
          </button>
        ) : null}
        {marathon.status !== 'archived' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => save('archived')}
            className="rounded-full border border-line px-4 py-2 text-sm text-muted transition hover:text-fg disabled:opacity-50"
          >
            보관(archived)
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
