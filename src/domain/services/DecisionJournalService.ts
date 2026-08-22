import { createMarketData } from '@/data/market/MarketData';
import { DecisionRepository } from '@/data/repositories/journal/DecisionRepository';
import {
  DecisionEntry,
  IDecisionEntry,
  IDecisionEvidence,
} from '../entities/journal/DecisionEntry';
import { MarketDataPort } from '../market/MarketDataPort';
import {
  DecisionReview,
  JournalSummary,
  reviewDecision,
  summariseJournal,
} from '../journal/DecisionReview';
import { validateDecisionEntry } from '../validation/EntityValidators';
import { summariseIssues } from '../validation/ValidationIssue';

/**
 * The decision journal: record a decision with the evidence behind it, and later
 * see whether the reasoning held up.
 *
 * The review compares the benchmark level frozen in each entry with the level
 * now, so it needs market data — injected, so the read path can be exercised
 * without a network.
 */

export interface JournalEntryWithReview {
  entry: DecisionEntry;
  review: DecisionReview;
}

export class DecisionJournalService {
  private readonly repository: DecisionRepository;
  private readonly market: MarketDataPort;

  constructor(market: MarketDataPort = createMarketData()) {
    this.repository = new DecisionRepository();
    this.market = market;
  }

  public async list(): Promise<DecisionEntry[]> {
    return this.repository.getAll();
  }

  /**
   * Records a decision. Rejected rather than corrected on invalid input: an
   * entry with no reasoning is the one thing a journal cannot be reviewed from.
   */
  public async record(entry: IDecisionEntry): Promise<DecisionEntry> {
    const issues = validateDecisionEntry(entry);
    if (issues.length > 0) {
      throw new Error(`Decision is not valid — ${summariseIssues(issues)}`);
    }
    return this.repository.save(entry);
  }

  public async addReviewNote(id: number, note: string, today = new Date()): Promise<void> {
    const entries = await this.repository.getAll();
    const entry = entries.find(candidate => candidate.id === id);
    if (!entry) throw new Error(`No journal entry with id ${id}`);

    await this.repository.save({ ...entry, reviewedAt: today, reviewNote: note.trim() });
  }

  public async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Every entry with its verdict, newest first, plus the aggregate.
   *
   * One market fetch covers the whole journal: benchmarks are per category and
   * several categories share a series, so a hundred entries still cost at most a
   * handful of requests — and none at all when the session cache is warm.
   */
  public async review(
    today = new Date()
  ): Promise<{ entries: JournalEntryWithReview[]; summary: JournalSummary }> {
    const entries = await this.repository.getAll();
    if (entries.length === 0) {
      return { entries: [], summary: summariseJournal([]) };
    }

    const categories = Array.from(new Set(entries.map(entry => entry.category)));
    const { trends } = await this.market.benchmarkTrends(categories);
    const levelByCategory = new Map(
      trends.map(trend => [trend.category, trend.trend.latest] as const)
    );

    const reviewed = entries.map(entry => ({
      entry,
      review: reviewDecision(entry, levelByCategory.get(entry.category), today),
    }));

    return {
      entries: reviewed,
      summary: summariseJournal(reviewed.map(item => item.review)),
    };
  }

  /**
   * The evidence for a decision the user is about to record, gathered from the
   * same tools the assistant reads. Assembled here rather than in the container
   * so the figures in a journal entry are the ones the pages showed, not a
   * second implementation of them.
   */
  public static evidenceFrom(options: {
    targetPercent?: number;
    actualPercent?: number;
    driftPercent?: number;
    benchmark?: string;
    benchmarkLevel?: number;
    benchmarkAsOf?: string;
    drawdownPercent?: number;
    returnOverWindowPercent?: number;
    sentimentMean?: number;
    sentimentLabel?: string;
    sentimentArticleCount?: number;
  }): IDecisionEvidence {
    // Undefined fields are dropped rather than stored, so a journal entry never
    // implies it recorded a figure that was not on screen.
    return Object.fromEntries(
      Object.entries(options).filter(([, value]) => value !== undefined)
    ) as IDecisionEvidence;
  }
}
