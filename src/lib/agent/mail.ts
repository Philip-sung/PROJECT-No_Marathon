import 'server-only';
import nodemailer from 'nodemailer';
import { serverEnv } from '@/lib/env.server';
import { logger } from '@/lib/observability/logger';
import type { CollectionRunResult } from '@/lib/agent/types';

/**
 * 수집 리포트 메일(네이버 SMTP). 수집이 끝나면(수동/cron 무관) 내용·토큰 소모량·
 * 비용(USD)을 메일로 발송한다. send-naver-mail 스킬과 동일한 자격증명을 쓰되,
 * Python 스킬에 의존하지 않고 서버(Node)가 직접 SMTP 로 보낸다(턴키/cron 호환).
 *
 * 자격증명(NAVER_MAIL_USER/NAVER_MAIL_APP_PASSWORD)이 없으면 조용히 생략한다 —
 * 메일 실패가 수집 자체를 막지 않는다(best-effort).
 */
const SMTP_HOST = 'smtp.naver.com';
const SMTP_PORT = 465; // SSL

export interface StagedSummary {
  name: string;
  event_date: string;
  area: string;
  source: string | null;
  quality_score: number | null;
}

export interface CollectionReportData {
  result: CollectionRunResult;
  staged: StagedSummary[];
  startedAtIso: string;
  finishedAtIso: string;
  mode: 'mock' | 'live';
  /** true 면 수집분이 즉시 게시됨(검수 대기 아님). */
  autoPublished: boolean;
}

export interface MailOutcome {
  sent: boolean;
  reason?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const OUTCOME_LABEL: Record<string, string> = {
  staged: '검수대기 등록',
  skipped_duplicate: '중복 건너뜀',
  rejected_quality: '품질 미달 반려',
  failed: '실패',
  aborted_budget: '예산 중단',
  empty: '수집 결과 없음',
};

export function buildReportSubject(d: CollectionReportData): string {
  const day = d.finishedAtIso.slice(0, 10);
  const tag = d.mode === 'live' ? 'LIVE' : 'MOCK';
  const verb = d.autoPublished ? '게시' : '신규';
  return `[no-marathon] 수집 리포트 ${day} · ${verb} ${d.result.staged}건 · $${d.result.total_cost_usd.toFixed(4)} (${tag})`;
}

export function buildReportText(d: CollectionReportData): string {
  const r = d.result;
  const lines: string[] = [];
  lines.push(`no-marathon 수집 리포트 (${d.mode.toUpperCase()})`);
  lines.push(`run_id: ${r.run_id}`);
  lines.push(`시작: ${d.startedAtIso}`);
  lines.push(`종료: ${d.finishedAtIso}`);
  lines.push('');
  lines.push('── 요약 ──');
  lines.push(
    `타깃 ${r.targets} · 신규 ${r.staged} · 중복 ${r.skipped} · 반려 ${r.rejected} · 실패 ${r.failed}${r.escalated ? ' · ⚠ escalated' : ''}`,
  );
  lines.push('');
  lines.push('── 토큰/비용 ──');
  lines.push(
    `입력 토큰 ${r.total_input_tokens.toLocaleString()} · 출력 토큰 ${r.total_output_tokens.toLocaleString()} · 합계 ${(r.total_input_tokens + r.total_output_tokens).toLocaleString()}`,
  );
  lines.push(`비용(USD): $${r.total_cost_usd.toFixed(6)}`);
  lines.push('');
  lines.push(
    d.autoPublished
      ? '── 신규 수집(즉시 게시됨) ──'
      : '── 신규 수집(검수 대기) ──',
  );
  if (d.staged.length === 0) {
    lines.push('(없음)');
  } else {
    for (const m of d.staged) {
      lines.push(
        `• ${m.name} | ${m.event_date} | ${m.area}${m.quality_score !== null ? ` | 품질 ${m.quality_score}` : ''}`,
      );
      if (m.source) {
        lines.push(`  출처: ${m.source}`);
      }
    }
  }
  lines.push('');
  lines.push('── 타깃별 결과 ──');
  for (const t of r.results) {
    lines.push(
      `• [${OUTCOME_LABEL[t.outcome] ?? t.outcome}] ${t.target}${t.notes ? ` — ${t.notes}` : ''}`,
    );
  }
  lines.push('');
  lines.push(
    d.autoPublished
      ? '자동 게시됨: 위 항목은 즉시 공개되었습니다. 틀린 정보는 /admin 에서 수정/보관하세요.'
      : '검수/게시: /admin 에서 확인 후 "게시"를 눌러야 사용자에게 노출됩니다.',
  );
  return lines.join('\n');
}

export function buildReportHtml(d: CollectionReportData): string {
  const r = d.result;
  const chip = (label: string, value: string, color: string): string =>
    `<td style="padding:10px 14px;background:${color};border-radius:10px;text-align:center;">
       <div style="font-size:11px;color:#475569;letter-spacing:.04em;">${label}</div>
       <div style="font-size:20px;font-weight:700;color:#0f172a;line-height:1.3;">${value}</div>
     </td>`;
  const stagedRows =
    d.staged.length === 0
      ? `<tr><td style="padding:12px;color:#64748b;">신규 수집 없음</td></tr>`
      : d.staged
          .map(
            (m) => `<tr>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">
                <div style="font-weight:600;color:#0f172a;">${escapeHtml(m.name)}</div>
                <div style="font-size:13px;color:#475569;">${escapeHtml(m.event_date)} · ${escapeHtml(m.area)}${m.quality_score !== null ? ` · 품질 ${m.quality_score}` : ''}</div>
                ${m.source ? `<div style="font-size:12px;"><a href="${escapeHtml(m.source)}" style="color:#2563eb;">${escapeHtml(m.source)}</a></div>` : ''}
              </td></tr>`,
          )
          .join('');
  const outcomeRows = r.results
    .map(
      (t) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eef2f7;font-size:13px;color:#0f172a;">${escapeHtml(OUTCOME_LABEL[t.outcome] ?? t.outcome)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eef2f7;font-size:13px;color:#334155;">${escapeHtml(t.target)}${t.notes ? `<br/><span style="color:#94a3b8;">${escapeHtml(t.notes)}</span>` : ''}</td>
      </tr>`,
    )
    .join('');
  const totalTokens = r.total_input_tokens + r.total_output_tokens;

  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr><td style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:22px 24px;">
      <div style="color:#93c5fd;font-size:12px;letter-spacing:.08em;">NO-MARATHON · 자동 수집 리포트</div>
      <div style="color:#ffffff;font-size:20px;font-weight:700;margin-top:4px;">${d.autoPublished ? '자동 게시' : '신규'} ${r.staged}건 · $${r.total_cost_usd.toFixed(4)}</div>
      <div style="color:#cbd5e1;font-size:12px;margin-top:6px;">${escapeHtml(d.mode.toUpperCase())} · ${escapeHtml(d.finishedAtIso)} · run ${escapeHtml(r.run_id.slice(0, 8))}</div>
    </td></tr>
    <tr><td style="padding:20px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>
        ${chip('타깃', String(r.targets), '#f1f5f9')}
        ${chip('신규', String(r.staged), '#dcfce7')}
        ${chip('중복', String(r.skipped), '#f1f5f9')}
        ${chip('반려', String(r.rejected), '#fef3c7')}
        ${chip('실패', String(r.failed), r.failed > 0 ? '#fee2e2' : '#f1f5f9')}
      </tr></table>

      <div style="margin-top:20px;padding:14px 16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
        <div style="font-size:12px;color:#64748b;letter-spacing:.04em;margin-bottom:6px;">토큰 소모량 · 비용</div>
        <div style="font-size:14px;color:#0f172a;">입력 <b>${r.total_input_tokens.toLocaleString()}</b> · 출력 <b>${r.total_output_tokens.toLocaleString()}</b> · 합계 <b>${totalTokens.toLocaleString()}</b> tokens</div>
        <div style="font-size:18px;color:#0f172a;font-weight:700;margin-top:4px;">$${r.total_cost_usd.toFixed(6)} <span style="font-size:12px;color:#64748b;font-weight:400;">(USD, 추정)</span></div>
      </div>

      <div style="margin-top:22px;font-size:14px;font-weight:700;color:#0f172a;">신규 수집 ${d.autoPublished ? '(즉시 게시됨)' : '(검수 대기)'}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">${stagedRows}</table>

      <div style="margin-top:22px;font-size:14px;font-weight:700;color:#0f172a;">타깃별 결과</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">${outcomeRows}</table>

      ${r.escalated ? `<div style="margin-top:18px;padding:12px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;color:#b91c1c;font-size:13px;">⚠ 가드레일 발동(escalated) — 예산/실패율 점검 필요</div>` : ''}

      <div style="margin-top:22px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
        ${
          d.autoPublished
            ? '품질 게이트를 통과한 항목은 <b>즉시 게시</b>되어 사용자에게 노출됩니다. 틀린 정보는 <b>/admin</b> 에서 수정/보관하세요.'
            : '수집은 <b>검수 대기(staging)</b> 까지만 진행됩니다. <b>/admin</b> 에서 확인·수정 후 "게시"를 눌러야 사용자에게 노출됩니다.'
        }
      </div>
    </td></tr>
  </table></body></html>`;
}

export async function sendCollectionReport(
  d: CollectionReportData,
): Promise<MailOutcome> {
  const user = serverEnv.NAVER_MAIL_USER;
  const pass = serverEnv.NAVER_MAIL_APP_PASSWORD;
  if (!user || !pass) {
    logger.warn('collection_report_skipped', {
      reason: 'NAVER_MAIL 자격증명 미설정',
      run_id: d.result.run_id,
    });
    return { sent: false, reason: 'no_credentials' };
  }
  const to = serverEnv.COLLECTION_REPORT_EMAIL || user;

  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: { user, pass },
    });
    await transport.sendMail({
      from: user,
      to,
      subject: buildReportSubject(d),
      text: buildReportText(d),
      html: buildReportHtml(d),
    });
    logger.info('collection_report_sent', {
      run_id: d.result.run_id,
      to,
      staged: d.result.staged,
      cost_usd: d.result.total_cost_usd,
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    logger.error('collection_report_failed', {
      run_id: d.result.run_id,
      message,
    });
    return { sent: false, reason: message };
  }
}
