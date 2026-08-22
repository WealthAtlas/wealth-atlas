import { Currency, DEFAULT_CURRENCIES } from './Currency';

/**
 * One category's intended share of the portfolio.
 *
 * This is the policy the drift calculation measures against, and it is what
 * turns "should I buy now?" from a judgement about the news into arithmetic:
 * a category below its target is short by a computable amount, whatever the
 * headlines say. Held as a whole-portfolio document rather than as independent
 * rows, because the shares are only meaningful relative to each other — a
 * target of 60% means nothing without knowing what the other 40% is for.
 *
 * A `targetPercent` of 0 is meaningful and is kept: it records a deliberate
 * decision to hold none of something, which is different from never having
 * considered it.
 */
export interface ICategoryTarget {
  /** An `AssetCategory` value. Typed as a string to match `IAsset.category`. */
  category: string;
  /** Intended share of total portfolio value, 0-100. */
  targetPercent: number;
  /**
   * How far the actual share may sit from the target before it is worth acting
   * on. Rebalancing on every wobble costs more in friction than the drift
   * costs, so the band is part of the policy rather than a display choice.
   */
  bandPercent?: number;
}

/**
 * App-level preferences that belong to the user's data rather than to a device,
 * so they travel through sync and backup: the base currency, the currency list
 * (rates themselves live in `currencyRates`), the AI provider configuration and the
 * target allocation.
 *
 * What stays device-local is the sync identity itself — key id, passphrase,
 * auto-sync toggle (see `src/data/sync/state.ts`). It cannot live here: it is
 * what decides *which* snapshot this device reads.
 *
 * This is a singleton row: exactly one record, always at `SETTINGS_ID`.
 */
export interface ISettings {
  id: number;
  /** The currency every cross-entity total is reported in. */
  baseCurrency: Currency;
  /**
   * The ISO codes this user's data may use — what the currency pickers offer.
   * Always contains `baseCurrency`. Codes are not restricted to a built-in list:
   * anything Intl can format works, and anything it cannot still renders as its
   * code.
   */
  currencies: Currency[];
  /** The provider AI import and the assistant talk to. */
  ai: IAiProviderSettings;
  /** The news provider the assistant reads market sentiment from. */
  news: INewsProviderSettings;
  /**
   * The intended allocation, empty until the user sets one. Empty is a real
   * state, not a missing value: with no policy there is no drift to report, and
   * the assistant has to ask what the user was aiming for rather than assume.
   */
  targetAllocation: ICategoryTarget[];
}

/**
 * The AI provider configuration, as the user typed it.
 *
 * Every field is optional and each `undefined` means "whatever the selected
 * preset says" — the preset table is transport detail, so resolution lives in
 * `src/data/llm/state.ts` rather than in the domain. Storing the raw values is
 * also what lets a preset change later ship a new default URL to a user who
 * never overrode it.
 *
 * `apiKey` travels through sync, which is end-to-end encrypted under the user's
 * passphrase, but is deliberately stripped from the plaintext backup file — see
 * `BackupService`.
 */
export interface IAiProviderSettings {
  presetId?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

/**
 * The news provider configuration.
 *
 * A separate block from `ai` rather than another field on it: they are different
 * services with different keys and different failure modes, and a user may well
 * run a local model with no key at all while still wanting news. Only a key is
 * stored — the endpoint and the topic set are not the user's choice, because the
 * topic vocabulary has to match what the aggregation code knows how to
 * partition (see `NewsTopics`).
 *
 * Like `ai.apiKey`, the key rides the encrypted sync snapshot but is stripped
 * from the plaintext backup file — see `BackupService`.
 */
export interface INewsProviderSettings {
  apiKey?: string;
}

export const SETTINGS_ID = 1;

export const DEFAULT_BASE_CURRENCY = Currency.INR;

/**
 * No default allocation is shipped. A target is a statement about this user's
 * risk appetite and horizon, and a plausible-looking default (60/40, say) would
 * be read as a recommendation the app is in no position to make — then measured
 * against, and acted on.
 */
export function defaultSettings(): ISettings {
  return {
    id: SETTINGS_ID,
    baseCurrency: DEFAULT_BASE_CURRENCY,
    currencies: [...DEFAULT_CURRENCIES],
    ai: {},
    news: {},
    targetAllocation: [],
  };
}

/**
 * Same contract as `normaliseAiProviderSettings`: trimmed, with blank and
 * non-string fields dropped so an unset key is always `undefined` rather than
 * `''`. Used on every write and by the v9 migration.
 */
export function normaliseNewsProviderSettings(
  news: INewsProviderSettings | undefined
): INewsProviderSettings {
  const source = (news ?? {}) as Record<string, unknown>;
  const value = source.apiKey;
  if (typeof value !== 'string') return {};
  const trimmed = value.trim();
  return trimmed === '' ? {} : { apiKey: trimmed };
}

/** Percent fields are stored to two decimals; anything finer is noise. */
function normalisePercent(value: unknown, max: number): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return undefined;
  return Math.round(Math.min(numeric, max) * 100) / 100;
}

/**
 * Keeps the entries that can be stored, drops the rest, and keeps one entry per
 * category. Used on every write and by the v8 migration, so a row from either
 * path has the same shape — the same contract `normaliseAiProviderSettings`
 * holds.
 *
 * Deliberately not a validator: it does not reject a category outside
 * `AssetCategory`, because `IAsset.category` is a plain string and rejecting one
 * here would silently discard a target the user had set. Whether a category is
 * one the app knows is a question for `validateTargetAllocation`, which can say
 * so out loud.
 */
export function normaliseTargetAllocation(value: unknown): ICategoryTarget[] {
  if (!Array.isArray(value)) return [];

  const byCategory = new Map<string, ICategoryTarget>();

  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const source = entry as Record<string, unknown>;

    const category = typeof source.category === 'string' ? source.category.trim() : '';
    if (category === '' || byCategory.has(category)) continue;

    const targetPercent = normalisePercent(source.targetPercent, 100);
    if (targetPercent === undefined) continue;

    const bandPercent = normalisePercent(source.bandPercent, 100);

    byCategory.set(category, {
      category,
      targetPercent,
      ...(bandPercent === undefined ? {} : { bandPercent }),
    });
  }

  return Array.from(byCategory.values());
}

/**
 * The configured list with the base currency guaranteed present and no
 * duplicates, in a stable order (base first). Dropping the base currency would
 * leave every total labelled in something the user cannot select.
 */
export function normaliseCurrencies(
  currencies: Currency[] | undefined,
  baseCurrency: Currency
): Currency[] {
  const codes = (currencies ?? []).map(code => code.toUpperCase());
  return Array.from(new Set([baseCurrency, ...codes]));
}

/**
 * Keeps only the string fields, trimmed, and drops the empty ones so an unset
 * field is always `undefined` rather than `''` — the two would otherwise mean
 * different things to preset resolution. Used on every write and by the v7
 * migration, so a row from either path has the same shape.
 */
export function normaliseAiProviderSettings(
  ai: IAiProviderSettings | undefined
): IAiProviderSettings {
  const source = (ai ?? {}) as Record<string, unknown>;
  const normalised: IAiProviderSettings = {};

  for (const field of ['presetId', 'baseUrl', 'apiKey', 'model'] as const) {
    const value = source[field];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed !== '') normalised[field] = trimmed;
  }

  return normalised;
}
