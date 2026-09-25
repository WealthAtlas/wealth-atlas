# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Dev server at localhost:3000
pnpm build            # Production build
pnpm build:check      # TypeScript check + build
pnpm test:run         # Single test run
pnpm test             # Watch mode
pnpm lint             # ESLint (0 warnings allowed)
pnpm lint:fix         # Auto-fix ESLint issues
pnpm type-check       # TypeScript validation
pnpm quality          # type-check → lint → format:check (run before committing)
pnpm format           # Prettier write over src/

pnpm vitest run src/domain/utils/DateUtils.test.ts        # one file
pnpm vitest run -t "inclusive end date"                   # tests matching a name
for tz in UTC America/New_York Europe/London Asia/Kolkata; do TZ=$tz pnpm test:run; done  # date code: see below
```

## Architecture

Wealth Atlas is a local-first React 18 PWA for personal wealth tracking. Stack: Vite, TypeScript, Material-UI, Dexie (IndexedDB). Strict DDD with three layers:

- `src/domain/` — Pure business logic. Entities (`entities/`), domain services (`services/`), validation (`validation/`), AI import logic (`import/`), utilities. No external dependencies.
- `src/data/` — Repository pattern over Dexie. One declared schema version in `database.ts`, optional sync to a configurable AWS API (`VITE_SYNC_API_URL`), LLM provider transport (`llm/`).
- `src/app/` — React UI: containers, pages, dialogs, views, providers, routing.

**Data flow:** Container → Service → Repository → Domain entity. Never skip a layer.

## Key Rules

**Container-presentational split (strict):**
- `*Container.tsx` — smart; fetches and mutates data via Services only, never repositories directly.
- `*Page.tsx`, `*Dialog.tsx`, `*View.tsx` — dumb; UI rendering only, no state or business logic.
- Large presentational components split into child views, each with its own container.

**Domain rules:**
- All portfolio/expense/asset calculations are runtime only — never stored in DB.
- **Expenses are never converted.** Currency conversion is for assets, loans and goals, where a
  holding grows and both sides of a ratio move at the same rate. An expense is a settled outflow: it
  does not grow, no ratio spans two of them, and restating last year's spend at today's rate invents
  a figure the user never paid. So spending is reported once per currency it was paid in —
  `MonthlyExpense` and `computeExpenseBreakdown` take a `Currency`, not a `CurrencyConverter`,
  `ExpenseChartsView` puts both charts behind one currency picker (hidden when there is only one),
  and `getExpenseBreakdown` hands the assistant a `byCurrency` array. A missing rate therefore cannot understate spending, so no expense figure carries
  `unratedCurrencies`. Passing an expense total through `CurrencyConverter` is the regression to
  watch for.
- Use existing domain classes; don't create new ones unless the domain model requires it.
- Use `Logger` utility instead of `console.*`.
- No custom CSS — Material-UI components exclusively.
- Entity validation lives in `src/domain/validation/`, never inline in a dialog — forms and the AI importer share the same rules.
- Report user-visible failures through `useNotification()`; `Logger` is for diagnostics only. No `alert()`.

**Persistence invariants:**
- `Currency` is stored as an ISO code (`INR`), never a symbol. Symbols come from `CURRENCY_SYMBOLS`/`getCurrencySymbol`.
- **A date the user enters is a calendar day in UTC, never an instant.** Every such column is UTC
  midnight: `maturityDate`, `investments.date`, `expenses.date`, `payments.date`, `loans.startDate`,
  `goals.maturityDate` and the three schedule columns on `sips`/`emis`. `src/domain/utils/DateUtils.ts`
  is the only place the arithmetic happens — `utcDay`/`parseUtcDay` produce one, `addUtcDays`/
  `addUtcMonths`/`addUtcYears`/`utcMonthStart` step one, and `UIUtils.formatDate` renders one with
  `timeZone: 'UTC'`. Entity constructors truncate on read; the Dexie hooks in `database.ts` truncate on
  write (`CalendarDateFields.ts`) — so no repository can forget.

  The rule exists because mixing the two readings drifts the *day*, and drifts it differently on each
  device. A date input yields `YYYY-MM-DD`, which `new Date(...)` reads as UTC midnight, while
  `setMonth`, `getMonth` and `toLocaleDateString` all work in the browser's zone. That is one bug with
  four faces, and none of them is visible at or ahead of UTC, which is why it survived: a monthly SIP
  starting 1 Jan walked 1 Jan → 3 Mar → 2 Apr in New York; an occurrence landed an hour before the
  end date it was meant to equal under BST; a 1 Jan expense displayed as 31 Dec; and — *in IST* —
  `ExpenseChartsView`'s bucket key disagreed with `monthKey` about which month an expense belonged to,
  because `new Date(y, m)` is local midnight and serialises into the previous month.

  Machine timestamps are **not** calendar dates and keep their time. The `*UpdatedAt` value stamps
  drive one-day staleness checks where the time of day *is* the content, and
  `createdAt`/`reviewedAt` record when something happened rather than which day it is for.
  `CalendarDateFields.ts` lists what is a day and says why each instant is excluded; that comment is
  the load-bearing part.

  No migration, and deliberately: no repository does an indexed date-range query, so every date
  comparison happens in memory on an entity that has already truncated. A legacy row therefore behaves
  correctly the moment it is read and is cleaned the next time it is written, and a schema bump would
  have bought nothing but the mesh lockout it forces on every other device.

  Two behaviours follow that were previously accidental. A schedule's `endDate` is **inclusive** —
  what the dialog's "until {endDate}" already promised, and the only reading under which a schedule
  whose start and end are the same day produces the one instalment it describes. And a month-based
  step is anchored to the schedule's `startDate` day-of-month, so a SIP on the 31st pays 31 Jan →
  29 Feb → 31 Mar: clamping against the *previous* occurrence instead would lose the day-of-month for
  good (29 Feb → 29 Mar → 29 Apr), and overflowing — the old `setMonth` behaviour — walks it forward.
  `DateUtils.test.ts` pins the arithmetic and `SIP.test.ts`/`EMI.test.ts` the boundary; run the suite
  under a spread of `TZ` values, because a test written with local-time constructors passes either way.
- `IInvestment.totalAmount` is the **total** transaction value and is always positive; buy/sell direction lives in `type` (see `Investment.getSignedAmount`).
- Any change to a persisted row shape needs a Dexie `version()` bump in `src/data/database.ts`, a
  `SNAPSHOT_VERSION` bump in `src/data/sync/Syncer.ts`, and a `BACKUP_VERSION` bump in
  `BackupService`. There is **no migrations directory and no upgrade chain** any more, in any of the
  three. That is not an oversight, it is what the version numbers are now for: an older snapshot or
  backup is imported exactly as it stands, because a field added since reads as absent (which is what
  the entity defaults are for) and a field removed since is one nothing reads. Only the *other*
  direction is refused — `requireReadableSnapshot` and `upgradeBackupData` throw on a file newer than
  this build, because importing a shape this build has no field for drops what it cannot name and the
  very next push writes the truncated copy back over the cloud.

  The same asymmetry governs Dexie. `database.ts` declares **one** `version(13).stores({...})` with no
  `upgrade()` handler: Dexie diffs it against whatever the device holds, so an older store picks up
  the index changes on open and nothing else, and a store not named there (`deletions`) is one Dexie
  removes. Every transform the old v3–v13 handlers ran has long since run on the devices that were
  there for it. If you ever do need a genuine row rewrite, it belongs in a new `version(n).upgrade()`
  wrapped so its writes count as automatic — see the `withoutScheduling` note in `src/data/sync/CLAUDE.md`.

  A new *table* still needs its `Table` field, its name in the `stores({...})` block, `ALL_TABLES`,
  `AutoSyncService.startListening()`, `rehydrateDates`' `DATE_FIELDS`, `Snapshot.data` in
  `sync/types.ts`, the `Syncer` snapshot build/clear/`bulkPut` lists, and `BackupService`
  (`BackupData`, export, `clearAllData`, `bulkAdd`). Missing `clearAllData` in particular is silent: a
  restore would `bulkAdd` onto the existing rows and collide on ids.
- A write that changes nothing claims nothing. `isNoOpUpdate` (`src/data/sync/RowChanges.ts`) gates the push: a dialog hands back the row it was given, so pressing Save without editing fires the `updating` hooks with no change in them, and a push used to be armed behind it. Sync publishes the *whole database*, so the cost of that pointless write is not one row — it is a new cloud version, which makes every other device stale and turns each of their next edits into a conflict.
- Rows arriving via JSON (backup, sync snapshot) must go through `rehydrateSnapshotDates` (`src/data/rehydrateDates.ts`) before being written; otherwise Date columns land as strings.
- Every preference the Settings page edits lives in the `settings` singleton (`ISettings`), so it travels through sync and backup: base currency, the currency list (rates in `currencyRates`), and the AI provider config (`settings.ai`). Only the sync identity itself is device-local — key id, passphrase, auto-sync toggle in `src/data/sync/state.ts`. `settings.ai.apiKey` is the one exception to symmetry: it rides the encrypted sync snapshot but `BackupService` strips it from the export, because that file is plaintext on the user's disk.
- `src/data/llm/state.ts` reads `settings.ai` from a synchronous in-memory cache filled in Dexie's `ready` handler. Any code path that replaces the settings row (sync pull, backup restore) must call `hydrateAiProviderSettings()` afterwards.
- `AutoSyncService.startListening()` hooks a hardcoded table list. A new table has to be added there too, or edits to it never wake a push. Wrap a write that is a migration rather than a user decision in `AutoSyncService.withoutScheduling` so it does not race the device's own first pull. Keep that wrapper around **writes, never around waiting**: suppression is a process-wide depth counter, not something scoped to the work that asked for it, so anything it spans is claimed as automatic — a user's edit made inside the window included, and such an edit gets neither a push nor an unpushed mark, so the next pull replaces it with no trace that it existed. `App`'s startup block therefore suppresses only the SIP/EMI conversions, and `AssetService.updateValue` runs its value script outside the wrapper and suppresses just the write it ends with.
- A sync pull and a backup restore replace every table at once, but containers hold what they read on mount. Both paths call `emitDatabaseReplaced()`; anything holding synced state subscribes with `useDatabaseReplaced` (or `useDatabaseVersion` when it reads live during render). A container whose loader depends on `converter` from `useCurrency` already re-runs, because `CurrencyProvider` subscribes. A container with an editable draft must not clobber unsaved input — adopt the new value only when the draft is clean.

**Sync (`src/data/sync/CLAUDE.md`)** — the remote is one encrypted blob that cannot merge, so every
sync replaces a whole database and every push is a compare-and-swap against `lastRemoteVersion`
(backed by a conditional `expectedVersion` write on the server). A refused sync is a persisted
`SyncConflict` the user resolves; there are no manual Push/Pull buttons. Read that file before
touching anything under `src/data/sync/`, `AutoSyncService`, `BackupService` or the startup pull order.

**Starting up (`src/app/containers/shell/CLAUDE.md`)** — the app must never show a blank page,
because a user's only unaided remedy is clearing site data, which deletes every record. Both failure
screens tell them not to; keep that sentence. Covers `src/index.tsx`'s `showBootFailure`,
`openDatabase()`'s `stale-build` case, `AppFailureBoundary`/`AppFailureView` and `reloadWithFreshBuild`
(which clears cached builds only, never IndexedDB or local storage).

**Testing:** Only complex domain logic (Vitest). Skip UI and repository tests. There are no migration tests left because there are no migrations left; what replaced them is `SyncE2E`'s pair of snapshot-compatibility tests — an older snapshot imports as it stands, a newer one is refused. Sync is the one exception to "no repository tests": `SyncE2E.test.ts` drives the real Dexie store through `fake-indexeddb` — see `src/data/sync/CLAUDE.md`, including why any write replaying rows wholesale (restore, sync import, a future `version().upgrade()`) must run inside `AutoSyncService.withoutScheduling`.

## Domain Model Summary

Six bounded contexts: **Assets** (stocks, real estate, funds, FDs, gold — with three valuation strategies: market-based, fixed-income, maturity-based), **Transactions** (buy/sell, quantity + total amount), **SIPs** (scheduled recurring investments, auto-converted to transactions on startup), **Expenses** (categorised spending with essential/non-essential flag, reported per currency and never converted), **Loans** (payment schedules via EMIs, overdue detection, IRR via Newton-Raphson), and **Goals** (percentage-based asset allocations, inflation-adjusted targets).

Each subsystem below has its own `CLAUDE.md` holding its design rationale and invariants; it loads
when you work in that directory (the `src/data/...` and `src/domain/entities/...` counterparts import
the same file). Read it before changing the subsystem — most of the rules there are prose that only a
prompt test or nothing at all would catch.

- **Assistant** — `src/domain/chat/CLAUDE.md` (also `src/data/llm/`, `src/data/sandbox/`,
  `src/data/agents/`): tool registry, the router/specialists/adviser/reviewer graph, transcript
  invariants, the `runCalculation` sandbox policy, the adviser persona and prompt rules 8g/8h, the
  chat sheet UI. `@langchain/langgraph` is imported **only** from `src/data/agents/ChatGraph.ts`,
  lazily; every node's logic stays in `src/domain/chat/agents/`.
- **Market context & target allocation** — `src/domain/market/CLAUDE.md`: per-category benchmarks,
  drawdown vs return, `AllocationDrift`, `ISettings.targetAllocation` (no default; empty ≠ on target;
  0% is meaningful).
- **News sentiment** — `src/domain/news/CLAUDE.md`: AlphaVantage, one unfiltered request per fetch,
  25/day quota, never cache an empty feed.
- **Fund universe** — `src/domain/funds/CLAUDE.md`: `screenFunds`/`compareFunds`, SEBI-name
  segmentation, stale-NAV liveness, no performance figures in a screen.
- **Decision journal** — `src/domain/journal/CLAUDE.md`: verdicts judge the reasoning, not the P&L;
  unscoreable verdicts are named; read-only to the assistant.
- **Assistant memory** — `src/domain/memory/CLAUDE.md`: never store a figure the app can compute;
  background curator; injected into the system prompt, not the snapshot.

Note: `.github/domain-patterns.md` (and the README's Expenses paragraph) describe a **Scheduled Expenses** context. It is not implemented — there is no such entity, table or service. Treat those sections as aspirational.

Extended domain patterns: `.github/domain-patterns.md`  
Technical standards (lint/TS config): `.github/technical-guide.md`  
Developer workflow: `.github/workflow-guide.md`

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
