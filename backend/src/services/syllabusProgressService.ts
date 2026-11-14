/**
 * syllabusProgressService
 * ------------------------------------------------------------------
 * Pure, deterministic logic for the Faculty Academic Load & Syllabus
 * Progress Tracking module.
 *
 * NOTHING in this file imports Prisma, Express, or any storage/UI layer.
 * The functions take plain values and return plain values, so the
 * critical timing rule and the percentage calculation can be verified
 * in complete isolation — which is exactly how the test suite exercises
 * them.
 *
 * Two pieces of business logic live here:
 *
 *   1. evaluateExpiry()   — the time-expiry rule. Decides whether exactly
 *      one extra load period should be added for a topic when its allotted
 *      time expires without completion. It also reports whether the topic
 *      is overdue (past its single allowed extra period) and how much time
 *      remains in the current period.
 *
 *   2. calculateProgress() — the syllabus percentage, computed strictly
 *      from completed topics / total topics. Extra loads are NEVER part of
 *      this number; they are tracked and rendered separately.
 * ------------------------------------------------------------------
 */

/** Maximum extra load periods that may ever be added for a single topic. */
export const MAX_EXTRA_LOADS_PER_TOPIC = 1;

export type TopicStatus = 'PENDING' | 'DONE';

/**
 * Inputs to the time-expiry rule. The function is deliberately agnostic to
 * where these values come from — it does not read a clock or a database.
 */
export interface ExpiryRuleInput {
  /** Allotted time for one load period, in minutes. */
  allottedMinutes: number;
  /** Minutes elapsed since the topic's load period started. */
  elapsedMinutes: number;
  /** Whether the topic has already been marked done. */
  completed: boolean;
  /** How many extra load periods have already been recorded for this topic. */
  extraLoadsAdded: number;
}

export interface ExpiryRuleResult {
  /**
   * True iff the allotted time has expired, the topic is still not done,
   * and the single allowed extra load has not yet been recorded. This is the
   * one and only trigger that adds an extra load period.
   */
  shouldAddExtraLoad: boolean;
  /** True iff the current (most recent) load period has expired without completion. */
  isExpired: boolean;
  /** True iff elapsed time exceeds the original period PLUS the one allowed extra. */
  isOverdue: boolean;
  /** The hard cap on extra loads (always 1). */
  extraLoadCap: number;
  /** Number of full allotted periods that have elapsed (informational). */
  periodsElapsed: number;
  /** Minutes remaining in the current period; 0 when expired/overdue/completed. */
  remainingMinutesInPeriod: number;
}

/**
 * The time-expiry rule, isolated and deterministic.
 *
 * Rules encoded here (matching the module spec):
 *  - A completed topic never receives an extra load, no matter the elapsed time.
 *  - When the allotted time expires and the topic is NOT done, add EXACTLY ONE
 *    extra load period — and only once (extraLoadsAdded < cap).
 *  - After the original period and its single extra have both expired, the topic
 *    is "overdue"; no further extra loads are ever added.
 */
export function evaluateExpiry(input: ExpiryRuleInput): ExpiryRuleResult {
  const { allottedMinutes, elapsedMinutes, completed, extraLoadsAdded } = input;
  const cap = MAX_EXTRA_LOADS_PER_TOPIC;

  if (completed) {
    return {
      shouldAddExtraLoad: false,
      isExpired: false,
      isOverdue: false,
      extraLoadCap: cap,
      periodsElapsed: 0,
      remainingMinutesInPeriod: 0,
    };
  }

  const safeAllotted = allottedMinutes > 0 ? allottedMinutes : 0;
  const periodsElapsed =
    safeAllotted > 0 ? Math.floor(elapsedMinutes / safeAllotted) : 0;

  // The original period expires the moment elapsed time strictly exceeds it.
  const isExpired = safeAllotted > 0 && elapsedMinutes > safeAllotted;

  // The single extra load is added once, when the original period expires.
  const shouldAddExtraLoad = isExpired && extraLoadsAdded < cap;

  // Total available time = original period + the one allowed extra period.
  const totalAvailableMinutes = safeAllotted * (1 + cap);
  const isOverdue =
    safeAllotted > 0 && elapsedMinutes > totalAvailableMinutes;

  const remainingMinutesInPeriod =
    safeAllotted > 0
      ? Math.max(0, safeAllotted - (elapsedMinutes % safeAllotted))
      : 0;

  return {
    shouldAddExtraLoad,
    isExpired,
    isOverdue,
    extraLoadCap: cap,
    periodsElapsed,
    remainingMinutesInPeriod,
  };
}

/**
 * Computes the syllabus progress percentage from completed topics only.
 * Extra loads are deliberately excluded — they are a separate metric.
 *
 *   percentage = completedCount / totalTopics * 100
 *
 * Returns 0 when there are no topics (avoids a divide-by-zero). The result is
 * rounded to 2 decimal places.
 */
export function calculateProgress(completedCount: number, totalTopics: number): number {
  if (!Number.isFinite(totalTopics) || totalTopics <= 0) return 0;
  const completed = Number.isFinite(completedCount) && completedCount > 0 ? Math.floor(completedCount) : 0;
  const ratio = Math.min(completed, totalTopics) / totalTopics;
  return Number((ratio * 100).toFixed(2));
}

/** Converts a load-period start instant into elapsed minutes since then. */
export function elapsedMinutesSince(
  start: Date | string | number,
  now: Date | string | number = new Date()
): number {
  const startMs = start instanceof Date ? start.getTime() : new Date(start).getTime();
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.round((nowMs - startMs) / 60000));
}

/** Formats an allotted-time budget in minutes as a compact human label. */
export function formatAllottedTime(allottedMinutes: number): string {
  if (!Number.isFinite(allottedMinutes) || allottedMinutes <= 0) return '0 min';
  if (allottedMinutes < 60) return `${allottedMinutes} min`;
  const hours = allottedMinutes / 60;
  return Number.isInteger(hours) ? `${hours} hr` : `${hours.toFixed(1)} hr`;
}

// ─── Aggregation (still pure) ─────────────────────────────────

export interface TopicProgressView {
  topicId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  allottedMinutes: number;
  status: TopicStatus;
  completedAt: string | null;
  extraLoads: number;
  expiry: ExpiryRuleResult;
}

export interface ProgressSummary {
  totalTopics: number;
  completedTopics: number;
  pendingTopics: number;
  /** Syllabus percentage — completed / total, extra loads excluded. */
  percentage: number;
  /** Total extra load periods across all of this faculty's topics. */
  totalExtraLoads: number;
  /** Topics whose allotted time + single extra have expired without completion. */
  overdueTopics: number;
}

/**
 * Pure aggregation over a faculty's topics. Accepts already-fetched plain
 * data so it stays free of storage concerns and is trivially testable.
 */
export function summarizeProgress(topics: TopicProgressView[]): ProgressSummary {
  let completed = 0;
  let totalExtraLoads = 0;
  let overdue = 0;

  for (const t of topics) {
    if (t.status === 'DONE') completed++;
    totalExtraLoads += t.extraLoads;
    if (t.expiry.isOverdue) overdue++;
  }

  return {
    totalTopics: topics.length,
    completedTopics: completed,
    pendingTopics: topics.length - completed,
    percentage: calculateProgress(completed, topics.length),
    totalExtraLoads,
    overdueTopics: overdue,
  };
}
