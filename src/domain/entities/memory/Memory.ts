/**
 * One durable fact about the user, kept between conversations.
 *
 * The assistant can read every record the user has but knows nothing about the
 * *person* from one session to the next: `ChatService` holds the transcript in
 * memory only, deliberately. For the transcript that is right. For facts about
 * the user it is the one real hole in the model, and rule 6 of the chat prompt
 * names it — the app does not track income, so the assistant has to ask what is
 * available every single time, and the answer dies with the sheet.
 *
 * What belongs here is therefore what no table can hold: what the user wants,
 * what they will not do, what is coming up in their life, and what they have
 * already told the assistant to stop doing.
 *
 * What must never end up here is a figure the app can compute. Every invariant
 * in this codebase pushes the same way — portfolio maths is runtime only and
 * never stored, the snapshot rides the live question so the model never sees two
 * generations of net worth, an expense is never restated at today's rate. A row
 * saying "net worth is 8,700,000" is worse than the same guess in a transcript,
 * because it persists and is re-injected on every future turn. A number is only
 * storable when the number *is* the fact and nothing can compute it: what the
 * user can invest, an inflow they expect, an age they are aiming at.
 *
 * Deliberately no `expiresOn`. The curator writes absolute dates into `text` and
 * prunes what it supersedes; a second clock is a second thing to get wrong.
 *
 * Both dates are top level because `rehydrateSnapshotDates` only walks a row's
 * top-level fields — the trap `IDecisionEvidence` documents. A `Date` nested in
 * here would return from a sync snapshot as a string.
 */

/**
 * Why a memory is worth keeping. A closed set rather than free text for two
 * reasons: it holds the curator to statements that have a durable shape, and it
 * gives the Settings list something to group by other than a wall of sentences.
 */
export enum MemoryKind {
  /** How the user wants to invest, or to be advised. */
  Preference = 'preference',
  /** A hard limit — what not to touch, what not to suggest. */
  Constraint = 'constraint',
  /** Life facts and timelines. The monthly investable amount lives here. */
  Context = 'context',
  /** Feedback on the assistant's own past behaviour. */
  Correction = 'correction',
}

export const MEMORY_KINDS: readonly MemoryKind[] = Object.values(MemoryKind);

/**
 * Who last wrote the row. Drives the Settings label and one curator rule; it is
 * deliberately *not* a write lock. Freezing text the user had touched would
 * leave a superseded "can invest 40,000" that the assistant could never correct,
 * which is a worse failure than the one it guards against. Visibility is the
 * protection here: every write is shown under the reply that caused it.
 */
export type MemorySource = 'assistant' | 'user';

export interface IMemory {
  id: number | undefined;
  kind: MemoryKind;
  /** One self-contained statement about the user, in the third person. */
  text: string;
  source: MemorySource;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * How many memories may be held at once. The whole set goes into every system
 * prompt, so this is a prompt budget rather than a storage limit: past roughly
 * this many short statements the block starts to crowd out the rules around it.
 * The curator is told the cap and asked to consolidate rather than exceed it.
 */
export const MEMORY_LIMIT = 40;

/** One statement, not a paragraph. Anything longer is two memories. */
export const MEMORY_TEXT_LIMIT = 300;

export class Memory implements IMemory {
  public readonly id: number | undefined;
  public readonly kind: MemoryKind;
  public readonly text: string;
  public readonly source: MemorySource;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(memory: IMemory) {
    this.id = memory.id;
    this.kind = memory.kind;
    this.text = memory.text.trim();
    this.source = memory.source;
    this.createdAt = new Date(memory.createdAt);
    this.updatedAt = new Date(memory.updatedAt);
  }
}

/**
 * Collapses the whitespace a model likes to leave behind. Newlines matter here:
 * the memory block is rendered one statement per line into the system prompt, so
 * a stored newline would split one memory into two apparent entries.
 */
export function normaliseMemoryText(text: string): string {
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
}

/** True when `value` is a `MemoryKind`, for parsing untrusted model output. */
export function isMemoryKind(value: unknown): value is MemoryKind {
  return typeof value === 'string' && (MEMORY_KINDS as readonly string[]).includes(value);
}
