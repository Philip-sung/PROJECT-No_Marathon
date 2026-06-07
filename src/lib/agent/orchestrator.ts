import 'server-only';
import { randomUUID } from 'node:crypto';
import { isMock } from '@/lib/env';
import { AGENT_CONFIG, estimateCostUsd } from '@/lib/agent/config';
import { getResearchTargets } from '@/lib/agent/targets';
import { researchMarathon } from '@/lib/agent/worker';
import { judgeQuality } from '@/lib/agent/judge';
import { contentHash } from '@/lib/agent/hash';
import * as repo from '@/lib/agent/repo';
import { sendCollectionReport, type StagedSummary } from '@/lib/agent/mail';
import { notify } from '@/lib/observability/notify';
import { logger } from '@/lib/observability/logger';
import type { CollectionRunResult, TargetResult } from '@/lib/agent/types';

/**
 * L3 Orchestrator-Worker + L4 Guardrails 통합 heartbeat(1회 실행).
 * 흐름: 타깃 → (가드레일) → worker 정형화 → dedup → judge → dry-run staging → ledger.
 * 가드레일 4단(PDF §12.4): per-call(maxTokens) / per-session(budget) /
 * per-day(quota) / anomaly(failure-rate circuit breaker).
 * 에이전트는 staging 까지만. published 승격은 사람 검수(ADR-007).
 */
export async function runCollection(): Promise<CollectionRunResult> {
  const runId = randomUUID();
  const nowIso = new Date().toISOString();
  const todayPrefix = nowIso.slice(0, 10);

  const targets = getResearchTargets().slice(0, AGENT_CONFIG.maxTargetsPerRun);
  const existing = await repo.existingContentHashes();
  const todayCostStart = await repo.todayCostUsd(todayPrefix);

  const results: TargetResult[] = [];
  const stagedDetails: StagedSummary[] = [];
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

    try {
      const research = await researchMarathon(target);
      totalInputTokens += research.usage.input_tokens;
      totalOutputTokens += research.usage.output_tokens;
      let cost = estimateCostUsd(
        AGENT_CONFIG.workerModel,
        research.usage.input_tokens,
        research.usage.output_tokens,
      );

      // L2 dedup(content_hash)
      const hash = contentHash(research.data);
      if (existing.has(hash)) {
        sessionCost += cost;
        await repo.logCollection({
          run_id: runId,
          target: target.query,
          content_hash: hash,
          status: 'skipped',
          quality_score: null,
          model: AGENT_CONFIG.workerModel,
          cost_usd: cost,
          nowIso,
        });
        results.push({
          target: target.query,
          outcome: 'skipped_duplicate',
          quality_score: null,
          cost_usd: cost,
          notes: '동일 content_hash 존재',
        });
        continue;
      }

      // LLM-as-judge 품질 게이트
      const judged = await judgeQuality(research.data);
      totalInputTokens += judged.usage.input_tokens;
      totalOutputTokens += judged.usage.output_tokens;
      cost += estimateCostUsd(
        AGENT_CONFIG.judgeModel,
        judged.usage.input_tokens,
        judged.usage.output_tokens,
      );
      sessionCost += cost;

      if (judged.data.score < AGENT_CONFIG.qualityThreshold) {
        await repo.logCollection({
          run_id: runId,
          target: target.query,
          content_hash: hash,
          status: 'failure',
          quality_score: judged.data.score,
          model: AGENT_CONFIG.judgeModel,
          cost_usd: cost,
          nowIso,
        });
        results.push({
          target: target.query,
          outcome: 'rejected_quality',
          quality_score: judged.data.score,
          cost_usd: cost,
          notes: judged.data.issues.join(', ') || '품질 임계 미달',
        });
        continue;
      }

      // 적재 후, autoPublish 면 즉시 게시(품질 게이트 통과분만). 아니면 staging 유지.
      const newId = await repo.stageMarathon(research.data, hash, nowIso);
      existing.add(hash);
      if (AGENT_CONFIG.autoPublish) {
        await repo.reviewMarathon(newId, 'publish');
      }
      stagedDetails.push({
        name: research.data.name,
        event_date: research.data.event_date,
        area: research.data.area,
        source: research.data.source ?? null,
        quality_score: judged.data.score,
      });
      await repo.logCollection({
        run_id: runId,
        target: target.query,
        content_hash: hash,
        status: AGENT_CONFIG.autoPublish ? 'success' : 'pending_review',
        quality_score: judged.data.score,
        model: AGENT_CONFIG.judgeModel,
        cost_usd: cost,
        nowIso,
      });
      results.push({
        target: target.query,
        outcome: 'staged',
        quality_score: judged.data.score,
        cost_usd: cost,
        notes: null,
      });
    } catch (err) {
      failures += 1;
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      await repo.logCollection({
        run_id: runId,
        target: target.query,
        content_hash: null,
        status: 'failure',
        quality_score: null,
        model: AGENT_CONFIG.workerModel,
        cost_usd: 0,
        nowIso,
      });
      results.push({
        target: target.query,
        outcome: 'failed',
        quality_score: null,
        cost_usd: 0,
        notes: message,
      });
    }

    // L4 anomaly circuit breaker — 실패율 초과 시 중단 + escalate
    if (
      results.length >= 3 &&
      failures / results.length > AGENT_CONFIG.maxFailureRate
    ) {
      escalated = true;
      // external escalation(PDF §11.3): 알림 + 중단.
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
  });

  // 수집 완료 리포트 메일(수동/cron 무관). best-effort — 메일 실패가 수집을 막지 않음.
  await sendCollectionReport({
    result: summary,
    staged: stagedDetails,
    startedAtIso: nowIso,
    finishedAtIso: new Date().toISOString(),
    mode: isMock ? 'mock' : 'live',
    autoPublished: AGENT_CONFIG.autoPublish,
  });

  return summary;
}
