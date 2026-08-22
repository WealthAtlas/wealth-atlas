import { Currency } from '../shared/Currency';

/**
 * One recorded investment decision, with the evidence that was in front of the
 * user when they made it.
 *
 * This is the entity that makes the rest of the advice falsifiable. Drift,
 * drawdown and news sentiment can each produce a confident-sounding case for
 * acting, and nothing in the app has so far been able to say whether any of
 * those cases turned out to be right. Recording the reasoning *with* the numbers
 * that supported it means a review months later compares a claim against an
 * outcome, rather than against a memory of what one believed at the time.
 *
 * That is also the only part of this feature that answers "I have poor financial
 * knowledge" rather than routing around it.
 */

export type DecisionAction = 'buy' | 'sell' | 'hold';

/**
 * Whether the user went through with it. A decision they considered and
 * declined is worth keeping: it is exactly as informative as one they took, and
 * dropping it would leave a journal that only ever recorded the trades that felt
 * compelling.
 */
export type DecisionStatus = 'proposed' | 'acted' | 'declined';

/**
 * The figures that were on screen, frozen. Every field is optional because a
 * decision can be recorded before news is configured, before a target is set,
 * or for a category with no benchmark — and a missing input must read as missing
 * rather than as zero.
 *
 * Deliberately holds no `Date`. `rehydrateSnapshotDates` only walks a row's
 * top-level fields, so a Date nested in here would come back from a sync
 * snapshot or a backup as a string and quietly break every comparison. The dates
 * that belong to the decision itself — `createdAt`, `reviewedAt` — stay at the
 * top level where the rehydration can see them, and the provenance stamps in
 * here are plain `YYYY-MM-DD` strings, which is all they are ever read as.
 */
export interface IDecisionEvidence {
  /** From the target allocation, at the time. */
  targetPercent?: number;
  actualPercent?: number;
  driftPercent?: number;
  /** From the market benchmark, at the time. */
  benchmark?: string;
  benchmarkLevel?: number;
  benchmarkAsOf?: string;
  drawdownPercent?: number;
  returnOverWindowPercent?: number;
  /** From news sentiment, at the time. */
  sentimentMean?: number;
  sentimentLabel?: string;
  sentimentArticleCount?: number;
}

export interface IDecisionEntry {
  id: number | undefined;
  createdAt: Date;
  /** The asset category the decision is about. */
  category: string;
  action: DecisionAction;
  status: DecisionStatus;
  /** What was actually moved, in `currency`. Undefined unless acted on. */
  amount: number | undefined;
  currency: Currency;
  /** Why, in the user's own words. The part a number cannot replace. */
  rationale: string;
  evidence: IDecisionEvidence;
  /** Set when the user has looked back at this entry and written a conclusion. */
  reviewedAt: Date | undefined;
  reviewNote: string | undefined;
}

export class DecisionEntry implements IDecisionEntry {
  public readonly id: number | undefined;
  public readonly createdAt: Date;
  public readonly category: string;
  public readonly action: DecisionAction;
  public readonly status: DecisionStatus;
  public readonly amount: number | undefined;
  public readonly currency: Currency;
  public readonly rationale: string;
  public readonly evidence: IDecisionEvidence;
  public readonly reviewedAt: Date | undefined;
  public readonly reviewNote: string | undefined;

  constructor(entry: IDecisionEntry) {
    this.id = entry.id;
    this.createdAt = new Date(entry.createdAt);
    this.category = entry.category;
    this.action = entry.action;
    this.status = entry.status;
    this.amount = entry.amount;
    this.currency = entry.currency;
    this.rationale = entry.rationale.trim();
    this.evidence = { ...entry.evidence };
    this.reviewedAt = entry.reviewedAt ? new Date(entry.reviewedAt) : undefined;
    this.reviewNote = entry.reviewNote;
  }

  /** A decision only makes a directional claim if it moved money one way. */
  public isDirectional(): boolean {
    return this.action !== 'hold';
  }
}
