import { SchemeMeta, UniverseScheme } from '@/domain/funds/FundScreen';
import { Logger } from '@/domain/utils/Logger';

/**
 * The scheme list and per-scheme metadata, cached in `localStorage`.
 *
 * Load-bearing rather than an optimisation, for the same reason `NewsCache` is,
 * though the cost being avoided is different. There is no request quota here —
 * the mirror is keyless — but the list is ~5.7MB and a segment's first screen
 * costs up to ~80 small metadata lookups. An in-memory cache would repeat both
 * on every page load of an installed PWA, and would repeat the 5.7MB download
 * on a phone.
 *
 * `localStorage` rather than a Dexie table, deliberately, and by exactly the
 * argument `NewsCache` sets out: a published list of every fund on the market is
 * not the user's data. It is device-local, has nothing to contribute to a sync
 * snapshot or a backup file, and keeping it out of Dexie keeps it out of the
 * four-way version bump a persisted row costs, which would buy nothing.
 *
 * What is stored is the **pruned** list — direct-plan growth schemes only, code
 * and name. That is 5,006 of the 37,835 rows and ~370KB of JSON, which fits a
 * `localStorage` budget the full list would not. The pruning rule lives in the
 * domain (`pruneUniverse`) and is applied before the write, so a change to it
 * needs the key below bumped, the way a changed news query did.
 */

const UNIVERSE_KEY = 'funds.universe.v1';
const META_KEY = 'funds.meta.v1';

/**
 * A week. New schemes launch continually but a fund the user could have bought
 * yesterday is still worth suggesting today, and the staleness check on each
 * candidate's NAV — not the age of this list — is what keeps a dead scheme out.
 */
const UNIVERSE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A month for metadata, because the fund house and category of a scheme do not
 * change. The NAV inside it does, which is why `latestNav` is reported as an
 * `navAsOf` date rather than as a current price, and why anything that needs a
 * live figure reads the history instead.
 */
const META_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredUniverse {
  fetchedAt: number;
  schemes: [number, string][];
}

interface StoredMeta {
  [code: string]: { fetchedAt: number; meta: SchemeMeta };
}

export interface CachedUniverse {
  schemes: UniverseScheme[];
  fetchedAt: Date;
}

function read<T>(key: string): T | undefined {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    // Private browsing and blocked site data both throw rather than return null.
    return undefined;
  }
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    Logger.warn(`Discarding an unreadable cache entry: ${key}`, error);
    return undefined;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // A full or unavailable store costs a cache, not the feature.
    Logger.warn(`Could not cache ${key}`, error);
  }
}

export function readCachedUniverse(now: number = Date.now()): CachedUniverse | undefined {
  const stored = read<StoredUniverse>(UNIVERSE_KEY);
  if (!stored || !Number.isFinite(stored.fetchedAt) || !Array.isArray(stored.schemes)) {
    return undefined;
  }
  if (now - stored.fetchedAt >= UNIVERSE_TTL_MS) return undefined;

  return {
    fetchedAt: new Date(stored.fetchedAt),
    // Stored as pairs rather than objects: at 5,000 rows the key names are a
    // third of the payload, and this cache is sized against a storage budget.
    schemes: stored.schemes.map(([code, name]) => ({ code, name })),
  };
}

export function writeCachedUniverse(schemes: UniverseScheme[], now: number = Date.now()): void {
  write(UNIVERSE_KEY, {
    fetchedAt: now,
    schemes: schemes.map(scheme => [scheme.code, scheme.name]),
  } satisfies StoredUniverse);
}

export function readCachedMeta(codes: number[], now: number = Date.now()): Map<number, SchemeMeta> {
  const stored = read<StoredMeta>(META_KEY) ?? {};
  const fresh = new Map<number, SchemeMeta>();

  for (const code of codes) {
    const entry = stored[String(code)];
    if (entry && Number.isFinite(entry.fetchedAt) && now - entry.fetchedAt < META_TTL_MS) {
      fresh.set(code, entry.meta);
    }
  }
  return fresh;
}

/**
 * Merges into whatever is already stored, so screening a second segment keeps
 * the first one's lookups. Segments overlap — a scheme matched by Mid Cap and by
 * Large & Mid Cap is the same scheme — and re-fetching it would be the cost this
 * cache exists to avoid.
 */
export function writeCachedMeta(entries: Map<number, SchemeMeta>, now: number = Date.now()): void {
  const stored = read<StoredMeta>(META_KEY) ?? {};
  for (const [code, meta] of entries) {
    stored[String(code)] = { fetchedAt: now, meta };
  }
  write(META_KEY, stored);
}
