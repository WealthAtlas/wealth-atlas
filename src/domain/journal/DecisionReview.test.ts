import { describe, expect, it } from 'vitest';
import { AssetCategory } from '../entities/assets/AssetCategory';
import {
  DecisionAction,
  DecisionEntry,
  IDecisionEvidence,
} from '../entities/journal/DecisionEntry';
import { Currency } from '../entities/shared/Currency';
import {
  INCONCLUSIVE_WITHIN_PERCENT,
  MIN_REVIEW_DAYS,
  reviewDecision,
  summariseJournal,
} from './DecisionReview';

const TODAY = new Date('2026-08-22T00:00:00.000Z');

function daysAgo(days: number): Date {
  return new Date(TODAY.getTime() - days * 24 * 60 * 60 * 1000);
}

function entry(
  action: DecisionAction,
  options: { days?: number; evidence?: IDecisionEvidence; id?: number } = {}
): DecisionEntry {
  return new DecisionEntry({
    id: options.id ?? 1,
    createdAt: daysAgo(options.days ?? MIN_REVIEW_DAYS + 10),
    category: AssetCategory.INDEX_FUND,
    action,
    status: 'acted',
    amount: 100000,
    currency: Currency.INR,
    rationale: 'Below target after a selloff.',
    evidence: options.evidence ?? { benchmarkLevel: 100 },
    reviewedAt: undefined,
    reviewNote: undefined,
  });
}

describe('reviewDecision', () => {
  it('scores a buy right when the benchmark rose', () => {
    const review = reviewDecision(entry('buy'), 115, TODAY);

    expect(review.benchmarkChangePercent).toBe(15);
    expect(review.verdict).toBe('direction-right');
    expect(review.isScored).toBe(true);
  });

  it('scores a buy wrong when the benchmark fell', () => {
    const review = reviewDecision(entry('buy'), 85, TODAY);

    expect(review.benchmarkChangePercent).toBe(-15);
    expect(review.verdict).toBe('direction-wrong');
  });

  it('inverts the test for a sell', () => {
    expect(reviewDecision(entry('sell'), 85, TODAY).verdict).toBe('direction-right');
    expect(reviewDecision(entry('sell'), 115, TODAY).verdict).toBe('direction-wrong');
  });

  it('refuses to score a hold, which makes no directional claim', () => {
    const review = reviewDecision(entry('hold'), 130, TODAY);

    expect(review.verdict).toBe('not-directional');
    expect(review.isScored).toBe(false);
    // Still reported: "the benchmark is up 30% since" is useful either way.
    expect(review.benchmarkChangePercent).toBe(30);
  });

  it('refuses to score a decision that is too recent', () => {
    const review = reviewDecision(entry('buy', { days: MIN_REVIEW_DAYS - 1 }), 140, TODAY);

    expect(review.verdict).toBe('too-soon');
    expect(review.isScored).toBe(false);
    expect(review.benchmarkChangePercent).toBe(40);
  });

  it('scores one that has just crossed the threshold', () => {
    const review = reviewDecision(entry('buy', { days: MIN_REVIEW_DAYS }), 110, TODAY);

    expect(review.verdict).toBe('direction-right');
  });

  it('calls a move smaller than the band inconclusive rather than right or wrong', () => {
    const review = reviewDecision(entry('buy'), 100 + INCONCLUSIVE_WITHIN_PERCENT / 2, TODAY);

    expect(review.verdict).toBe('inconclusive');
    expect(review.isScored).toBe(false);
  });

  it('has no verdict when no benchmark level was recorded', () => {
    const review = reviewDecision(entry('buy', { evidence: {} }), 120, TODAY);

    expect(review.verdict).toBe('no-evidence');
    expect(review.benchmarkChangePercent).toBeUndefined();
  });

  it('has no verdict when the current level is unknown', () => {
    // A dead benchmark source must not silently score every open decision.
    const review = reviewDecision(entry('buy'), undefined, TODAY);

    expect(review.verdict).toBe('no-evidence');
  });

  it('refuses a recorded level that cannot be a divisor', () => {
    for (const benchmarkLevel of [0, -5, Number.NaN]) {
      const review = reviewDecision(entry('buy', { evidence: { benchmarkLevel } }), 120, TODAY);
      expect(review.verdict, String(benchmarkLevel)).toBe('no-evidence');
    }
  });

  it('reports whole days since the decision', () => {
    expect(reviewDecision(entry('buy', { days: 200 }), 110, TODAY).daysSince).toBe(200);
  });

  it('never reports negative days for an entry dated in the future', () => {
    const future = new Date(TODAY.getTime() + 5 * 24 * 60 * 60 * 1000);
    const forward = new DecisionEntry({ ...entry('buy'), createdAt: future });

    expect(reviewDecision(forward, 110, TODAY).daysSince).toBe(0);
  });
});

describe('summariseJournal', () => {
  it('reports no hit rate at all when nothing has been scored', () => {
    const summary = summariseJournal([
      reviewDecision(entry('buy', { days: 5 }), 110, TODAY),
      reviewDecision(entry('hold'), 110, TODAY),
    ]);

    // Distinct from 0%: "nothing is old enough to judge" is not "all wrong".
    expect(summary.hitRatePercent).toBeUndefined();
    expect(summary.scoredCount).toBe(0);
    expect(summary.entryCount).toBe(2);
  });

  it('computes the hit rate over scored decisions only', () => {
    const summary = summariseJournal([
      reviewDecision(entry('buy', { id: 1 }), 120, TODAY),
      reviewDecision(entry('buy', { id: 2 }), 130, TODAY),
      reviewDecision(entry('buy', { id: 3 }), 80, TODAY),
      reviewDecision(entry('hold', { id: 4 }), 130, TODAY),
      reviewDecision(entry('buy', { id: 5, days: 2 }), 130, TODAY),
    ]);

    expect(summary.entryCount).toBe(5);
    expect(summary.scoredCount).toBe(3);
    expect(summary.rightCount).toBe(2);
    expect(summary.wrongCount).toBe(1);
    expect(summary.hitRatePercent).toBeCloseTo(66.67, 1);
  });

  it('accounts for every unscored entry so the denominator is legible', () => {
    const summary = summariseJournal([
      reviewDecision(entry('hold', { id: 1 }), 130, TODAY),
      reviewDecision(entry('buy', { id: 2, days: 3 }), 130, TODAY),
      reviewDecision(entry('buy', { id: 3, evidence: {} }), 130, TODAY),
    ]);

    expect(summary.unscored).toEqual({
      'not-directional': 1,
      'too-soon': 1,
      'no-evidence': 1,
    });
    expect(summary.entryCount - summary.scoredCount).toBe(3);
  });
});
