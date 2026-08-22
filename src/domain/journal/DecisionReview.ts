import { DecisionEntry } from '../entities/journal/DecisionEntry';

/**
 * Scores a recorded decision against what the benchmark did afterwards.
 *
 * What this measures, stated plainly: whether the **reasoning** pointed the
 * right way, not what the user earned. The score compares the benchmark level
 * frozen in the entry with the benchmark level now, so it is blind to what they
 * actually bought, when the money landed, and what it cost. That is the point —
 * a P&L figure confounds the judgement with the execution, and the judgement is
 * the thing a person can get better at.
 *
 * It is also why every verdict that cannot be earned is named rather than
 * defaulted. A journal that quietly scored "hold" decisions, or scored a
 * two-week-old one, would produce a hit rate that looks like evidence and is
 * not.
 */

/**
 * Below this, a verdict is noise. Three months is not a magic number; it is
 * roughly the point past which a single week's move stops deciding the answer,
 * and it is stated here rather than buried so it can be argued with.
 */
export const MIN_REVIEW_DAYS = 90;

/**
 * A benchmark move smaller than this is not a direction. Without it, a decision
 * would be marked right or wrong on a rounding difference.
 */
export const INCONCLUSIVE_WITHIN_PERCENT = 1;

export type DecisionVerdict =
  /** No benchmark level was recorded, so there is nothing to compare against. */
  | 'no-evidence'
  /** Recorded too recently for the comparison to mean anything. */
  | 'too-soon'
  /** A hold makes no directional claim, so there is nothing to be right about. */
  | 'not-directional'
  /** The benchmark barely moved. */
  | 'inconclusive'
  | 'direction-right'
  | 'direction-wrong';

export interface DecisionReview {
  entryId: number | undefined;
  category: string;
  action: string;
  daysSince: number;
  /** Benchmark move since the decision, as a percentage. */
  benchmarkChangePercent?: number;
  verdict: DecisionVerdict;
  /** Only the verdicts that actually score a claim count towards a hit rate. */
  isScored: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function reviewDecision(
  entry: DecisionEntry,
  currentBenchmarkLevel: number | undefined,
  today: Date
): DecisionReview {
  const daysSince = Math.max(
    0,
    Math.floor((today.getTime() - entry.createdAt.getTime()) / MS_PER_DAY)
  );

  const base = {
    entryId: entry.id,
    category: entry.category,
    action: entry.action,
    daysSince,
  };

  const recordedLevel = entry.evidence.benchmarkLevel;
  if (
    recordedLevel === undefined ||
    !Number.isFinite(recordedLevel) ||
    recordedLevel <= 0 ||
    currentBenchmarkLevel === undefined ||
    !Number.isFinite(currentBenchmarkLevel)
  ) {
    return { ...base, verdict: 'no-evidence', isScored: false };
  }

  const benchmarkChangePercent = round(
    ((currentBenchmarkLevel - recordedLevel) / recordedLevel) * 100
  );

  // Ordered deliberately: the change is always reported, because "the benchmark
  // is up 14% since" is useful even where no verdict can be earned from it.
  if (!entry.isDirectional()) {
    return { ...base, benchmarkChangePercent, verdict: 'not-directional', isScored: false };
  }
  if (daysSince < MIN_REVIEW_DAYS) {
    return { ...base, benchmarkChangePercent, verdict: 'too-soon', isScored: false };
  }
  if (Math.abs(benchmarkChangePercent) < INCONCLUSIVE_WITHIN_PERCENT) {
    return { ...base, benchmarkChangePercent, verdict: 'inconclusive', isScored: false };
  }

  const wasRight = entry.action === 'buy' ? benchmarkChangePercent > 0 : benchmarkChangePercent < 0;

  return {
    ...base,
    benchmarkChangePercent,
    verdict: wasRight ? 'direction-right' : 'direction-wrong',
    isScored: true,
  };
}

export interface JournalSummary {
  entryCount: number;
  /** Entries a verdict could actually be earned on. */
  scoredCount: number;
  rightCount: number;
  wrongCount: number;
  /**
   * Share of *scored* decisions that pointed the right way, or undefined when
   * none has been scored yet. Undefined rather than 0: "nothing is old enough to
   * judge" and "everything judged was wrong" must not look the same.
   */
  hitRatePercent?: number;
  /** Why the unscored ones were not scored, so the denominator is legible. */
  unscored: Record<string, number>;
}

export function summariseJournal(reviews: DecisionReview[]): JournalSummary {
  const unscored: Record<string, number> = {};
  let rightCount = 0;
  let wrongCount = 0;

  for (const review of reviews) {
    if (!review.isScored) {
      unscored[review.verdict] = (unscored[review.verdict] ?? 0) + 1;
      continue;
    }
    if (review.verdict === 'direction-right') rightCount++;
    else wrongCount++;
  }

  const scoredCount = rightCount + wrongCount;

  return {
    entryCount: reviews.length,
    scoredCount,
    rightCount,
    wrongCount,
    hitRatePercent: scoredCount === 0 ? undefined : round((rightCount / scoredCount) * 100),
    unscored,
  };
}
