import 'server-only';
import { randomUUID } from 'node:crypto';
import { isMock } from '@/lib/env';
import { AGENT_CONFIG, estimateCostUsd } from '@/lib/agent/config';
import { getResearchTargets } from '@/lib/agent/targets';
import { researchMarathon } from '@/lib/agent/worker';
import { judgeQuality } from '@/lib/agent/judge';
import { contentHash } from '@/lib/agent/hash';
import { StructuredCallError } from '@/lib/agent/claude';
import * as repo from '@/lib/agent/repo';
import { sendCollectionReport, type StagedSummary } from '@/lib/agent/mail';
import { notify } from '@/lib/observability/notify';
import { logger } from '@/lib/observability/logger';
import type {
  CollectionRunResult,
  NormalizedMarathon,
  TargetResult,
} from '@/lib/agent/types';

/** 원장 기록은 best-effort — DB 쓰기 실패가 수집/게시를 막지 않게 감싼다. */
async function logCollectionSafe(
  entry: Parameters<typeof repo.logCollection>[0],
): Promise<void> {
  try {
    await repo.logCollection(entry);
  } catch (err) {
    logger.warn('collection_log_write_failed', {
      run_id: entry.run_id,
      message: err instanceof Error ? err.message : '알 수 없는 오류',
    });
  }
}

/**
 * L3 Orchestrator-Worker + L4 Guardrails 통합 heartbeat(1회 실행).
 * 흐름: 타깃 → (가드레일) → worker 정형화 → dedup → judge → dry-run staging → ledger.
 * 가드레일 4단(PDF §12.4): per-call(maxTokens/maxWebSearchUses/maxInputTokensPerCall) /
 * per-session(budget) / per-day(quota) / anomaly(failure-rate circuit breaker).
 *
 * runCollection 은 성공/실패/크래시 무관하게 **항상 리포트 메일을 발송**한다(토큰·비용 보고).
 * collect() 내부에서 던져진 예외도 잡아 실패 리포트를 보낸다.
 */
async function collect(
  runId: string,
  startedAtIso: string,
): Promise<{ summary: CollectionRunResult; staged: StagedSummary[] }> {
  const nowIso = startedAtIso;
  const todayPrefix = nowIso.slice(0, 10);
  const targets = getResearchTargets().slice(0, AGENT_CONFIG.maxTargetsPerRun);

  // dedup 원장(content_hash) 조회 실패는 best-effort — 비용 천장과 무관하게
  // 중복을 못 거를 뿐이므로 수집을 계속한다.
  let existing = new Set<string>();
  try {
    existing = await repo.existingContentHashes();
  } catch (err) {
    logger.warn('collection_dedup_preload_failed', {
      run_id: runId,
      message: err instanceof Error ? err.message : '알 수 없는 오류',
    });
  }

  // 일일 비용 원장은 L3 dailyQuota(비용 천장)의 유일한 근거다. 못 읽으면 천장을
  // 강제할 수 없으므로, 0 으로 진행(=천장 무력화)하지 않고 즉시 중단한다(fail-safe).
  // throw → runCollection 의 catch 가 받아 실패 리포트 메일을 발송한다.
  let todayCostStart: number;
  try {
    todayCostStart = await repo.todayCostUsd(todayPrefix);
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    logger.error('collection_cost_ledger_unreadable', {
      run_id: runId,
      message,
    });
    throw new Error(
      `일일 비용 원장 조회 실패 — 비용 천장을 강제할 수 없어 수집을 중단합니다: ${message}`,
    );
  }

  const results: TargetResult[] = [];
  const stagedDetails: StagedSummary[] = [];
  // pass-forward: 앞 타깃이 발견한 후보를 누적해 다음 타깃에 넘긴다(앵커 중복 검색 제거).
  const discovered: NormalizedMarathon[] = [];
  const discoveredKeys = new Set<string>();
  let sessionCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let failures = 0;
  let escalated = false;

  for (const target of targets) {
    // L3 per-day quota / L2 per-session budget
    if (todayCostStart + sessionCost >= AGENT_CONFIG.dailyQuotaUsd) {
      results.push({
        target: target.query,
        outcome: 'aborted_budget',
        quality_score: null,
        cost_usd: 0,
        notes: '일일 비용 한도 도달',
      });
      escalated = true;
      break;
    }
    if (sessionCost >= AGENT_CONFIG.sessionBudgetUsd) {
      results.push({
        target: target.query,
        outcome: 'aborted_budget',
        quality_score: null,
        cost_usd: 0,
        notes: '세션 예산 도달',
      });
      break;
    }

    // ── worker: 한 타깃에서 그 달 마라톤을 전부 열거(리스트) ──
    let candidates: NormalizedMarathon[] = [];
    let workerFailed = false;
    try {
      // discovered(앞 타깃 누적)를 넘겨 앵커 재조회를 끄고 교차검증 모드로 돌린다.
      const research = await researchMarathon(target, discovered);
      totalInputTokens += research.usage.input_tokens;
      totalOutputTokens += research.usage.output_tokens;
      // web_search 비용은 worker 호출당 1회 — 리스트 길이와 무관하게 한 번만 가산.
      const workerCost = estimateCostUsd(
        AGENT_CONFIG.workerModel,
        research.usage.input_tokens,
        research.usage.output_tokens,
      );
      sessionCost += workerCost;
      candidates = research.data;
      // 다음 타깃에 넘길 후보 누적(이름+날짜 기준 중복 제거로 힌트 목록을 가볍게 유지).
      for (const c of candidates) {
        const key = `${c.name}|${c.event_date}`;
        if (!discoveredKeys.has(key)) {
          discoveredKeys.add(key);
          discovered.push(c);
        }
      }
      // 검색 비용을 원장에 적재 — 일일 quota(todayCostUsd)가 이 합을 읽으므로 누락 금지.
      await logCollectionSafe({
        run_id: runId,
        target: target.query,
        content_hash: null,
        status: candidates.length > 0 ? 'success' : 'skipped',
        quality_score: null,
        model: AGENT_CONFIG.workerModel,
        cost_usd: workerCost,
        nowIso,
      });
    } catch (err) {
      workerFailed = true;
      failures += 1;
      // #5: 실패해도 usage 를 회수해 비용·예산 가드에 반영(실패 호출이 예산을 안 보이게 빠져나가지 못하게).
      let workerCost = 0;
      if (err instanceof StructuredCallError) {
        totalInputTokens += err.usage.input_tokens;
        totalOutputTokens += err.usage.output_tokens;
        workerCost = estimateCostUsd(
          AGENT_CONFIG.workerModel,
          err.usage.input_tokens,
          err.usage.output_tokens,
        );
        sessionCost += workerCost;
      }
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      await logCollectionSafe({
        run_id: runId,
        target: target.query,
        content_hash: null,
        status: 'failure',
        quality_score: null,
        model: AGENT_CONFIG.workerModel,
        cost_usd: workerCost,
        nowIso,
      });
      results.push({
        target: target.query,
        outcome: 'failed',
        quality_score: null,
        cost_usd: workerCost,
        notes: message,
      });
    }

    // 그 달 도로통제 대회가 없으면(정상) 한 줄 남기고 다음 타깃.
    if (!workerFailed && candidates.length === 0) {
      results.push({
        target: target.query,
        outcome: 'empty',
        quality_score: null,
        cost_usd: 0,
        notes: '도로통제 수반 대회 없음',
      });
    }

    // ── 각 대회: dedup → judge → stage(+publish) ──
    for (const candidate of candidates) {
      // L2 dedup(content_hash)
      const hash = contentHash(candidate);
      if (existing.has(hash)) {
        await logCollectionSafe({
          run_id: runId,
          target: target.query,
          content_hash: hash,
          status: 'skipped',
          quality_score: null,
          model: AGENT_CONFIG.workerModel,
          cost_usd: 0,
          nowIso,
        });
        results.push({
          target: target.query,
          outcome: 'skipped_duplicate',
          quality_score: null,
          cost_usd: 0,
          notes: `${candidate.name} (동일 content_hash)`,
        });
        continue;
      }

      // LLM-as-judge 품질 게이트(judge 비용은 대회 1건당 1회)
      let judgeCost = 0;
      let score: number;
      let issues: string[];
      try {
        const judged = await judgeQuality(candidate);
        totalInputTokens += judged.usage.input_tokens;
        totalOutputTokens += judged.usage.output_tokens;
        judgeCost = estimateCostUsd(
          AGENT_CONFIG.judgeModel,
          judged.usage.input_tokens,
          judged.usage.output_tokens,
        );
        sessionCost += judgeCost;
        score = judged.data.score;
        issues = judged.data.issues;
      } catch (err) {
        failures += 1;
        if (err instanceof StructuredCallError) {
          totalInputTokens += err.usage.input_tokens;
          totalOutputTokens += err.usage.output_tokens;
          judgeCost = estimateCostUsd(
            AGENT_CONFIG.judgeModel,
            err.usage.input_tokens,
            err.usage.output_tokens,
          );
          sessionCost += judgeCost;
        }
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        results.push({
          target: target.query,
          outcome: 'failed',
          quality_score: null,
          cost_usd: judgeCost,
          notes: `judge 실패(${candidate.name}): ${message}`,
        });
        continue;
      }

      if (score < AGENT_CONFIG.qualityThreshold) {
        await logCollectionSafe({
          run_id: runId,
          target: target.query,
          content_hash: hash,
          status: 'failure',
          quality_score: score,
          model: AGENT_CONFIG.judgeModel,
          cost_usd: judgeCost,
          nowIso,
        });
        results.push({
          target: target.query,
          outcome: 'rejected_quality',
          quality_score: score,
          cost_usd: judgeCost,
          notes: `${candidate.name}: ${issues.join(', ') || '품질 임계 미달'}`,
        });
        continue;
      }

      // 적재 후, autoPublish 면 즉시 게시(품질 통과분만). DB 쓰기 실패는 그 1건만 실패 처리.
      try {
        const newId = await repo.stageMarathon(candidate, hash, nowIso);
        existing.add(hash);
        if (AGENT_CONFIG.autoPublish) {
          await repo.reviewMarathon(newId, 'publish');
        }
        stagedDetails.push({
          name: candidate.name,
          event_date: candidate.event_date,
          area: candidate.area,
          source: candidate.source ?? null,
          quality_score: score,
        });
        await logCollectionSafe({
          run_id: runId,
          target: target.query,
          content_hash: hash,
          status: AGENT_CONFIG.autoPublish ? 'success' : 'pending_review',
          quality_score: score,
          model: AGENT_CONFIG.judgeModel,
          cost_usd: judgeCost,
          nowIso,
        });
        results.push({
          target: target.query,
          outcome: 'staged',
          quality_score: score,
          cost_usd: judgeCost,
          notes: candidate.name,
        });
      } catch (err) {
        failures += 1;
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        results.push({
          target: target.query,
          outcome: 'failed',
          quality_score: score,
          cost_usd: judgeCost,
          notes: `적재 실패(${candidate.name}): ${message}`,
        });
      }
    }

    // L4 anomaly circuit breaker — 실패율 초과 시 중단 + escalate
    if (
      results.length >= 3 &&
      failures / results.length > AGENT_CONFIG.maxFailureRate
    ) {
      escalated = true;
      await notify({
        level: 'error',
        title: '수집 에이전트 circuit breaker',
        detail: `run=${runId} 실패율 초과(${failures}/${results.length}) — 수집 중단`,
        fields: { run_id: runId },
      });
      break;
    }
  }

  const tally = (outcome: TargetResult['outcome']) =>
    results.filter((r) => r.outcome === outcome).length;

  const summary: CollectionRunResult = {
    run_id: runId,
    targets: targets.length,
    staged: tally('staged'),
    skipped: tally('skipped_duplicate'),
    rejected: tally('rejected_quality'),
    failed: tally('failed'),
    total_cost_usd: Number(sessionCost.toFixed(6)),
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    escalated,
    results,
  };
  return { summary, staged: stagedDetails };
}

export async function runCollection(): Promise<CollectionRunResult> {
  const runId = randomUUID();
  const startedAtIso = new Date().toISOString();

  let summary: CollectionRunResult;
  let staged: StagedSummary[] = [];
  try {
    const out = await collect(runId, startedAtIso);
    summary = out.summary;
    staged = out.staged;
  } catch (err) {
    // 오케스트레이션 자체가 터져도 실패 리포트는 반드시 보낸다.
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    logger.error('collection_run_crashed', { run_id: runId, message });
    summary = {
      run_id: runId,
      targets: 0,
      staged: 0,
      skipped: 0,
      rejected: 0,
      failed: 1,
      total_cost_usd: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      escalated: true,
      results: [
        {
          target: '오케스트레이션 오류',
          outcome: 'failed',
          quality_score: null,
          cost_usd: 0,
          notes: message,
        },
      ],
    };
  }

  // 성공·실패·크래시 무관하게 항상 리포트 메일 발송(토큰/비용/실패사유 포함).
  const mail = await sendCollectionReport({
    result: summary,
    staged,
    startedAtIso,
    finishedAtIso: new Date().toISOString(),
    mode: isMock ? 'mock' : 'live',
    autoPublished: AGENT_CONFIG.autoPublish,
  });

  logger.info('collection_run', {
    run_id: summary.run_id,
    staged: summary.staged,
    skipped: summary.skipped,
    rejected: summary.rejected,
    failed: summary.failed,
    cost_usd: summary.total_cost_usd,
    input_tokens: summary.total_input_tokens,
    output_tokens: summary.total_output_tokens,
    escalated: summary.escalated,
    mail_sent: mail.sent,
    mail_reason: mail.reason ?? null,
  });

  return { ...summary, mail_sent: mail.sent };
}
