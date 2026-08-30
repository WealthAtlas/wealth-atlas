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
  wrapped so its writes count as automatic — see the `withoutScheduling` note under Testing.

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

**Sync (`src/data/sync/`)** — the remote is one opaque encrypted blob behind a version counter the
*server* assigns, and it cannot merge because it cannot decrypt. So sync replaces a whole database in
one direction or the other, every operation is a potential deletion of one, and the client is the
only place that can be caught. It once was not caught at all: `push` PUT the snapshot with no
precondition, so a device that had been offline for a day needed one edit to replace the cloud with
its stale copy, and the device that had done the work then pulled that copy over itself — two silent
whole-database deletions from one edit.

The design is four rules, and they are deliberately the whole of it. An earlier version tried to
*merge* two devices row by row — per-row `uid` and `updatedAt`, a `deletions` tombstone table, a
`lineage` marker to stop two uid spaces being fused. Every one of those was load-bearing for the
others, and the failures they produced were invisible: a stale row winning a tie, a tombstone lost to
a crash resurrecting a deleted row, an unset lineage quietly collapsing every sync back to a replace.
For one person with a phone and a laptop, two devices editing the same record in the same breath is
rare enough that resolving it automatically was never worth that surface. It is now a question the
user answers, with both copies intact.

- **A push may only overwrite the exact version it was based on.** The API's PUT takes no expected
  version, so `decidePush` is a compare-and-swap the client performs itself: read the remote version,
  compare against `lastRemoteVersion`, write only if they are *equal*. Not "not ahead" — the counter
  is the server's, so a remote version *below* this device's base cannot mean "we are ahead"; it
  means the blob that base names is gone (a recreated key, a reset backend) and pushing would replace
  a stranger's data on the strength of a number that no longer counts the same thing. An unknown base
  is a conflict too: a device that cannot say what it is based on cannot claim to be current.
  `requireRemoteVersion` falls back to a full GET on backends predating `/version`, because for a
  push "could not tell" must never mean "go ahead".

  Every write therefore publishes: the change hooks in `AutoSyncService` schedule a debounced
  `SyncService.push()`, which either lands or records a conflict and stops.

- **The gap the compare-and-swap cannot close, and what is done about it.** `decidePush` reads the
  version and then writes, with a network round trip in between, and the API accepts every PUT — so
  two devices can both read v5, both pass the check, and both be taken. That is not a theoretical
  race: the loser was told its own push *succeeded*, so it cleared `pendingChangeSince`, and its next
  pull then took the winner's copy over the top with nothing raised. A silent whole-database loss
  from two ordinary edits.

  It is closed where it has to be, in the write itself. The push sends `expectedVersion` — the
  version it believes it is replacing — and the backend (`../wealth-atlas-sync`) applies the write
  only if the stored version still matches, refusing with **409** otherwise. `pushSnapshot` turns
  that 409 into the same `SyncConflictError` the pre-flight check raises, so the user is asked the
  question they were always going to be asked; the difference is that nothing was destroyed to get
  there. The field is omitted on a forced push, which is precisely a request to overwrite whatever is
  there, and a backend that does not understand it ignores it and behaves as it always did.

  The pre-flight `decidePush` stays in front of it, and not redundantly: it settles the ordinary
  stale device without spending a PUT, and before the whole snapshot is encrypted and uploaded.

  The `+1` check that follows a successful push is now a **backstop**, and its comment says so. With
  the condition honoured the returned version is always one step on, so it should never fire — but
  that promise is made by a deployment rather than by this code, and a backend rolled back to before
  the conditional write silently returns to accepting every PUT. Consecutive versions are what make
  it work: the server counts exactly the writes that happened, so more than one step on means writes
  landed in between. A timestamp could not do this — it cannot count intervening writes, and
  client-minted ones skew between devices, which is why the version stays a counter.

  What it records is a `SyncOverwrite`, deliberately **not** a `SyncConflict`: this device is in step
  with the cloud and must keep syncing, so a full stop would be the wrong shape. It is also careful
  about what it claims. The backend allocates the version atomically but writes the pointer and the
  payload separately on the unconditional path, so the two PUTs can land their blobs in the opposite
  order to their versions — meaning the device holding the higher version is not necessarily the one
  whose copy survived. The alert therefore says the two copies diverged and points at the *other*
  device to export from, rather than naming a winner it cannot know.

- **The device pulls before it does anything else.** `App` runs `SyncService.autoSync()` — a pull —
  *before* the SIP/EMI conversions and before `updateValues()`. Ordering, not politeness: both of
  those write, and converting a schedule against a stale database creates rows the cloud already
  holds under ids it uses for something else. A stale device is also a device whose next edit is
  refused, so catching up first is what keeps the compare-and-swap from firing on an ordinary day.
  The 5-minute poll exists for the same reason — a long-open tab that drifts behind is a tab whose
  next edit conflicts.

  `decidePull` refuses only on `pendingChangeSince`: work this device has that the cloud has never
  seen. It used to refuse whenever the device held *any* records, which was right while a row-level
  merge handled the ordinary case and a replace was the exception. As the ordinary path it would open
  almost every session with a question about a copy the user has no reason to doubt — and a prompt
  shown that often is a prompt nobody reads.

- **The refusal is the whole safeguard.** There is no automatic recovery copy before a wipe any
  more; what a destructive operation would replace is *asked about* rather than filed. That is the
  trade this design makes, and it puts real weight on `decidePull`'s refusal and on the conflict card
  being answered rather than dismissed. Export Data in Settings is the only copy that outlives a
  wipe, and the Connect-to-existing form says so before it replaces the device.

- **Pull and push never interleave.** `runExclusive` serialises every remote operation. The poll
  fires on a timer, on `visibilitychange` and on `online`, any of which could land inside the 2s push
  debounce — and compare-and-swap cannot help there, because both halves are the same device.
  `importSnapshot` also runs under `withoutScheduling`, because `bulkPut` fires the `creating` hooks:
  without it every pull armed a push of what it had just imported, and left the device looking as
  though it held unpushed work — which is exactly the state `decidePull` refuses to import over.

A refused sync is a `SyncConflictError` and a persisted `SyncConflict` record, never a silent stop:
the background push swallows the throw, so the alert at the top of the Sync section is what stops
"sync quietly stopped working" from being the new failure. It is the **only** exit — there are no
manual Push and Pull buttons, so a conflict left unanswered is a device that pushes nothing and pulls
nothing for good. Two consequences follow and both are load-bearing. `SettingsContainer` subscribes to
`onSyncConflictChanged`, because the push that raises one runs in the background and the card would
otherwise not appear until the user navigated away and back. And `SyncE2E`'s "is the only way out"
test pins the deadlock: push refused, pull refused, then resolved. Resolution is the user's decision
between two copies (`resolveConflict`); the app does not merge two databases on their behalf and the
Settings copy says so. The card quotes **when the cloud copy was last saved**, not its version
number: choosing between two copies is a question about time, and a counter never answered it. The
server already returns `updatedAt` on every read, so a pull conflict has it in hand; a push conflict
pays one extra GET for it, on the conflict path only and best-effort — a conflict that could not be
raised because that request failed would be the worst possible trade.

**A deletion needs no record of itself.** It travels because the published snapshot simply no longer
contains the row. That is the single largest simplification here — tombstones existed only so a
row-level merge would not hand a deleted row back, and every repository deletes through plain Dexie
again.

**A build that is not this one.** The snapshot's `schemaVersion` survives the removal of the upgrade
chain because of the one case that cannot be shrugged off: a snapshot *newer* than this build is
refused outright (`requireReadableSnapshot`), since importing a shape with fields this build cannot
name drops them silently and the next push writes the truncation back over the cloud. Older is simply
read. The `getHighestSnapshotVersion` floor and the `SyncDowngradeError` that went with it are gone —
they existed to catch a v17-era build overwriting the blob with a shape that had dropped tombstones
and lineage, and with those columns no longer meaning anything there is nothing left for an older
snapshot to have silently lost.

**The one limit worth stating plainly:** two devices genuinely editing at once still lose one side's
work to whichever the user keeps, and with no recovery copy filed behind it. What the conditional
write removed is the *silent* version of that; the question itself is inherent to replacing whole
databases. That is the accepted
trade, not an oversight — the alternative was the merge machinery above, whose failure modes were
silent where this one is a card asking a question. Export Data before answering it if the losing copy
matters.

**The Settings surface is deliberately small**: Key ID, last sync, one auto-sync switch, Disconnect,
and the setup/link forms — plus the conflict card when there is one. Push, Pull, Sync Now, the remote
version readout, the listening/pending chips, the cloud-copy inspector and Change Passphrase were all
removed. Opening the app pulls and every edit publishes, so a manual button had nothing left to do
that the switch does not govern, and each one was another way to replace a whole database by hand.

**Starting up (`src/index.tsx`, `AppFailureBoundary`, `AppFailureView`)** — the app must never show
a blank page, and the reason is not polish. Records live in this device's IndexedDB, so a blank page
with no explanation leaves "clear the site data" as the only remedy a user can find unaided — and
that deletes every asset, transaction and expense. A failure to *read* then becomes a permanent loss,
by the user's own hand, with the app never having said a word. Telling them not to clear storage is the load-bearing sentence on
both screens; keep it whatever else changes.

Three layers, because the failures arrive by three different routes and none of them can see the
others. `openDatabase()` asks on purpose whether the store opens: Dexie opens lazily on the first
query, so an unopenable store otherwise surfaces as every screen failing at once, which looks exactly
like a blank app. It names `stale-build` separately because that case is not corruption — IndexedDB
refuses a database at a version above what the code asks for, which means *this bundle is older than
the data on this device*, and a PWA (`registerType: 'autoUpdate'`, precached) makes that ordinary.
`AppFailureBoundary` catches a render that throws, the only thing `componentDidCatch` can see, and
owns both because they end in the same screen. And `showBootFailure` in `index.tsx` is built out of
nothing — no imports, no React, no theme — because the original failure could not be caught by any
component: a precached build whose chunks the server no longer has, or a module that throws while
evaluating, leaves the page blank before anything mounts.

The recovery action is `reloadWithFreshBuild`: unregister the service worker, sweep `caches`, reload.
It touches **cached builds only, never IndexedDB or local storage** — it runs at the exact moment a
frightened user would be clearing those by hand, so it has to be provably incapable of doing it too.

**Testing:** Only complex domain logic (Vitest). Skip UI and repository tests. There are no migration tests left because there are no migrations left; what replaced them is `SyncE2E`'s pair of snapshot-compatibility tests — an older snapshot imports as it stands, a newer one is refused.

Sync is the one exception, and deliberately: `SyncE2E.test.ts` drives the real Dexie store (through
`fake-indexeddb`) and the real `SyncService` against a fake backend as dumb as the real one. The
decision functions are unit-testable and are unit-tested (`conflict.test.ts`), but the failures that
actually lose data live in the wiring — a hook that arms a push it should not, a restore that
publishes itself, a version compared the wrong way round — and none of them are visible to `tsc`, to
the build, or to a test of a pure function. `SyncE2E` simulates two devices by capturing and restoring
the store *and* the local sync state, which is all a device is as far as sync is concerned. It already
earned its place: it caught `BackupService` restoring rows through an unsuppressed `bulkAdd`.

Note the trap it found, because it applies to every write that is not a user's edit. The change hooks
fire for `bulkAdd`/`bulkPut` *and* for the `Collection.modify` calls that schema upgrades are made of,
so any path replaying rows wholesale must run inside `AutoSyncService.withoutScheduling` — a backup
restore, a sync import, and any `version().upgrade()` handler a future schema change adds. Unwrapped,
a device publishes its whole database on the first launch after an upgrade, racing its own first pull,
with whichever won deciding silently which copy survived. `database.ts` currently declares no upgrade
handler at all, so the wrapper it used to keep for them is gone — restore it with the handler if one
is ever needed again.

## Domain Model Summary

Six bounded contexts: **Assets** (stocks, real estate, funds, FDs, gold — with three valuation strategies: market-based, fixed-income, maturity-based), **Transactions** (buy/sell, quantity + total amount), **SIPs** (scheduled recurring investments, auto-converted to transactions on startup), **Expenses** (categorised spending with essential/non-essential flag, reported per currency and never converted), **Loans** (payment schedules via EMIs, overdue detection, IRR via Newton-Raphson), and **Goals** (percentage-based asset allocations, inflation-adjusted targets).

**Assistant (`src/domain/chat/`)** — an in-app chat that answers questions about the user's own
records and suggests next steps, using the provider configured for AI import. It reads through a
registry of tools (`ChatTools.ts`) built on the same domain services the pages use, so a figure it
quotes matches the page that shows it. The prompt's tool catalogue is generated from the registry
(`ChatPromptBuilder.ts`), the way `ImportPromptBuilder` generates its enum lists — adding a tool
needs no prompt edit. Multi-turn transport is `chatJsonTurns` in `src/data/llm/LlmClient.ts`; the
agent loop is `ChatLoop.ts`, pure apart from an injected transport and code runner so it is testable
without a network. Conversations are in-memory only, deliberately: nothing is persisted, so no Dexie
version bump. There is **no income entity**, so surplus cannot be computed — the assistant reasons
from committed SIP/EMI outflow, spending and goal shortfalls, and asks the user for the amount
available.

The conversation is a real transcript, not a list of question-and-answer pairs: `runChatLoop`
returns `ChatAnswer.transcript` — the questions, the replies, *and* the tool calls and results
behind them — and the container hands it straight back as `history`. That is what makes a follow-up
like "break that down by asset" work without re-running the lookups. Two invariants hold there. The
snapshot is attached to the live question only and the stored turn keeps the question bare, so the
model never sees two generations of net worth. And an assistant turn is always stored as the JSON
envelope: the model copies the shape of the last assistant message it can see, so a bare markdown
reply in history teaches it that prose is allowed and the next turn comes back unparseable
(`toProtocolHistory` re-wraps anything that is not already an envelope). `trimTranscript` drops the
oldest turns past `TRANSCRIPT_BUDGET_CHARS` and leaves one fixed note saying so.

`runCalculation` executes **model-authored JavaScript**, because a model doing arithmetic in its head
guesses. It runs in `src/data/sandbox/CodeSandbox.ts`, in an iframe sandboxed *without*
`allow-same-origin` — an opaque origin, where IndexedDB and localStorage throw — under
`default-src 'none'`, which blocks every outbound channel. `SANDBOX_FRAME_POLICY` holds those two
strings and `CodeSandbox.test.ts` pins them; widening either is a one-token edit that nothing else
would catch. This is deliberately *not* the posture of `ScriptExecutor`, which runs the user's own
asset scripts through `new Function` with a `with (sandbox)` wrapper: that code has a trusted author,
whereas a snippet from the model is steerable by asset names and imported statement text. The snippet
reaches no database, so everything it may compute over is passed in by `buildSandboxData`
(`SandboxData.ts`) using the same key names the read tools return; only plain JSON comes back.

**Market context (`src/domain/market/`, `src/data/market/`)** — the assistant can see how the
market a category sits in has actually moved, via `getMarketTrends`. Two rules shape it.

Retrieval is the *app's* job, not the model's: a local Ollama has no network, so the model is only
the reasoner over a series the app fetched. And the port reports a **benchmark per asset category**,
never per holding — nothing in `IAsset` records a scheme code or ticker, so matching a user's asset
to an instrument would be a guess, and a guess there attaches a real price history to the wrong
holding and reads as fact. `CATEGORY_BENCHMARKS` is a closed table; categories no market series
describes (Fixed Deposit, Pension, Real Estate, Cash) are deliberately absent and reported as
`unavailable`, the same honesty `unratedCurrencies` carries.

The sources are the two that are keyless *and* send `Access-Control-Allow-Origin: *`, which is the
binding constraint from a browser: `api.mfapi.in` (AMFI NAVs — equity via a Nifty index fund's NAV,
debt, gold) and `api.coingecko.com` (crypto). Yahoo Finance, Stooq and GDELT all fail one of those
two tests and cannot be called from a page at all. AlphaVantage does send the header and has a
`NEWS_SENTIMENT` endpoint, but it needs a key and a tight daily quota, so news is a later layer.

`NavSeries.ts` is the pure half and the reason this is worth having: `drawdownPercent` (how far below
the window's high) and `returnPercent` (change across the window) answer different questions, and
gold in Aug 2026 shows why — up 59% over a year while sitting 10.5% below the high it set inside it.
The window is anchored to the series' own last observation, not the clock, or every weekend would
silently shorten it. Prompt rules 8a/8b hold the line: a drawdown is never a forecast, and a
buy-or-sell question is never answered from a market figure alone.

`AllocationDrift.ts` is the piece that *does* size a decision — actual share against intended share,
with a tolerance band — and it is what `getAllocationDrift` answers from. Drift is what a decision is
measured from; a drawdown only says whether a gap is a cheaper entry or a thesis that changed.

The policy itself is `ISettings.targetAllocation` (`ICategoryTarget[]`, schema v8), a field on the
settings singleton rather than a table: the shares only mean anything as a set, so they are read and
written whole, and living in `settings` means they travel through sync and backup while `db.settings`
was already in the `AutoSyncService` hook list. `Goal.allocations` is emphatically not this — it is
asset-to-goal earmarking ("40% of this fund is for the house"), a different question from "what share
of my portfolio should be equity".

Three rules hold. **No default is shipped**: a plausible 60/40 would be read as advice the app cannot
give, then measured against and acted on. **Empty is a real state**, distinct from being on target —
`allocationDrift.isSet: false` in the snapshot and `hasTargetAllocation: false` from the tool both
mean the user has expressed no policy, and prompt rule 8c makes the assistant ask instead of assuming
one, because "you hold 70% equity" is a fact while "you hold too much equity" needs a target to be
too much *of*. And **a 0% target is meaningful** and survives every round trip — it records a
deliberate decision to hold none of something, which is why `normaliseTargetAllocation` tests for
`undefined` rather than falsiness.

**How the assistant is allowed to act on all this (`ChatPromptBuilder`, "Who you are" + rules
8g/8h)** — the tools measure; the prompt decides what a measurement licenses. Three pieces, and each
one is prose that only `ChatPromptBuilder.test.ts` can keep in place.

The **persona** exists because a model with no role answers a question about *a* portfolio: it
hedges, it lists considerations, and it recommends nothing. "Who you are" casts it as this user's own
adviser — lead with the recommendation, reason from their figures, be candid rather than agreeable,
be brief — and carries the not-a-licensed-adviser disclaimer with it, because the persona is the one
place that could quietly grow into one.

**8g: close a gap with new money before closing it with a sale.** A `DriftRow` for an overweight
category says `action: "sell"`, and a model reading that tells the user to sell. But a category is
usually over target because it *rose*, and the gap closes on its own once the next contributions go
to the underweight rows instead — for nothing, where a sale realises capital gains, an exit load or a
broken lock-in, none of which are in any record this app holds. So the default remedy is a redirect,
and a sale is reserved for a gap contributions cannot close in about a year, a broken thesis, or a
user who asked how to rebalance by selling. The `getAllocationDrift` note says the same thing at the
tool boundary: `"sell"` names the direction of the gap, not the remedy.

**8h: conditions can outrank the target, on evidence and with a size.** The policy was set in calmer
weather, so it is a default rather than a ceiling — a demonstrable regime justifies buying a category
already at target, or trimming one still inside its band. Two guards make that safe to allow. The
deviation must be *stated as one*: how far past the policy, that it departs from what the user said
they wanted, and what would reverse it. And **the evidence must be in the conversation** — the
model's training ended long before today, so a war, a recession or an inflated sector is knowable
only from `getMarketTrends` and `getNewsSentiment` results in front of it; a remembered crisis quoted
as current is the most convincing wrong sentence it can write. Since `NEWS_TOPICS` carries no
geopolitics or commodities topic, such an event is always an *indirect* read off the macro topics and
the benchmark series, and 8h requires saying so rather than asserting a cause. A tilt of this kind is
precisely what the decision journal is for, and the rule says to record it.

`validateTargetAllocation` rejects the whole set, not each row: over 100% is unholdable and would
make every drift figure wrong, while under 100% is allowed and reported as `untargeted` — a policy
covering part of the portfolio is a choice, not an error. The snapshot carries only the rows *outside*
their band, because it is resent on every turn.

**News sentiment (`src/domain/news/`, `src/data/news/`)** — `getNewsSentiment` gives the assistant a
*measurement* over recent articles per category, not a headline dump. The distinction is the whole
point: a model handed 50 articles writes a story, and it writes an equally fluent one whichever way
the market moved. A model handed "27 articles, relevance-weighted mean +0.14, Neutral, spanning 40
hours" has a number it can be held to, with the headlines attached so it cites instead of recalling.

AlphaVantage's `NEWS_SENTIMENT` is the source, on one hard criterion: it is the only news feed found
that both sends `Access-Control-Allow-Origin: *` and returns structured sentiment. GDELT rate-limits
anonymous callers and sends no CORS header; publisher RSS is almost universally CORS-blocked. Its
free tier allows **25 requests a day**, and that quota — not latency — shapes the design:

- **One request per fetch**, for the union of every topic in `NEWS_TOPICS`, partitioned to categories
  locally by `CATEGORY_TOPICS`. One request per category would burn a day in two questions. A test
  pins that every mapped topic is one actually fetched: a topic outside `NEWS_TOPICS` would match
  nothing for ever and look like a quiet news day. Every topic string was *observed in a real
  response* — the published list is behind a JS-rendered page, and an unrecognised topic risks
  failing the only request there is.
- **The cache is load-bearing**, not an optimisation, and lives in `localStorage` rather than Dexie.
  A cached public feed is not the user's data: it is device-local, has nothing to add to a sync
  snapshot, and restoring it from a six-month-old backup would hand the assistant six-month-old
  headlines as current. Session-only caching (the right call for NAVs, where refetching is free)
  would spend the whole quota on 25 reloads.
- Concurrent callers collapse onto one in-flight request, because two tools in one turn must not cost
  two quota units.

Sentiment is **relevance-weighted, not counted** — a passing mention must not weigh as much as a
dedicated piece, which is how a feed of tangential references comes to look like conviction — and an
article's weight for a category is the **max** relevance across that category's topics, never the sum,
or a broadly-tagged article outweighs a focused one. `sentimentLabelFor` reuses the provider's own
published bands verbatim; note its definition string says `Somewhat_Bullish` while the feed emits
`Somewhat-Bullish`, and the feed's spelling is the one that matches the data. A rejected key and a
spent quota both arrive as **HTTP 200 with a prose field**, so `parseNewsResponse` is separated from
the fetch and tested directly — the status code reveals neither.

Two honest limits, both reported rather than smoothed over. `isThinSample` marks a category with
fewer than five matching articles; the figure is still returned, because suppressing it invites the
model to fill the gap from memory. And the provider scores sentiment per *article*, not per category,
so a macro piece contributes its whole-article tone to every category tagged with that topic —
relevance weighting mitigates this but does not remove it. Prompt rules 8d/8e carry the reasoning:
sentiment explains a move that has already happened rather than predicting the next one, and the
useful reading is the four-way combination of drift, drawdown and sentiment.

`settings.news.apiKey` (schema v9) follows `settings.ai.apiKey` exactly — it rides the encrypted sync
snapshot, is stripped from the plaintext backup, and is carried over from the device on restore. No
endpoint is stored: the topic vocabulary has to match what the aggregation can partition, so a
configurable one would be a lie.

**Decision journal (`src/domain/entities/journal/`, `src/domain/journal/`, `/journal` route)** — the
piece that makes everything above falsifiable. Drift, drawdown and sentiment can each build a
confident case for acting, and without a record there is no way to tell which cases were right. An
entry freezes the *reasoning in the user's own words* alongside the figures that were on screen, and
`reviewDecision` later compares the benchmark level frozen in the entry with the level now.

What a verdict measures, stated precisely: **whether the reasoning pointed the right way, not what
the user earned.** It is blind to what they actually bought, when the money landed and what it cost,
because a P&L figure confounds the judgement with the execution — and the judgement is the part a
person can get better at. Prompt rule 8f forbids quoting a verdict as a return.

Every verdict that cannot be *earned* is named rather than defaulted, because a journal that quietly
scored the unscoreable would produce a hit rate that looks like evidence: `not-directional` for a
hold, `too-soon` under `MIN_REVIEW_DAYS` (90), `inconclusive` inside `INCONCLUSIVE_WITHIN_PERCENT`
(1%), `no-evidence` with no recorded level. `summariseJournal` therefore reports `hitRatePercent`
over `scoredCount`, never `entryCount`, returns `undefined` rather than 0 when nothing is scored —
"nothing is old enough to judge" must not look like "everything was wrong" — and itemises `unscored`
so the denominator is legible. A `declined` decision is kept: it is as informative as one taken, and
dropping it would leave a journal recording only the trades that felt compelling.

`getDecisionJournal` is **read-only, like every other chat tool**. The assistant may see what was
decided and how it turned out — "you sold gold in March on the same reasoning; the benchmark is down
8% since" is the most useful sentence it can offer — but writing an entry stays a deliberate act by
the user. A model that could write on a misparse would corrupt the one record the reviews are scored
from, and an entry the user did not write is not their reasoning.

`IDecisionEvidence` deliberately **holds no `Date`**. `rehydrateSnapshotDates` walks only a row's
top-level fields, so a nested Date would return from a sync snapshot or backup as a string and stay
one. `createdAt`/`reviewedAt` sit at the top level where the rehydration sees them; the provenance
stamps inside `evidence` are plain `YYYY-MM-DD` strings, which is all they are ever read as.

`decisions` (schema v10) was the **first new table since v5**, and so the first change to need more
than the version bumps — see the touch-point list under Persistence invariants. Missing `clearAllData`
in particular is silent: a restore would `bulkAdd` onto the existing journal and collide on ids.

**Assistant memory (`src/domain/entities/memory/`, `src/domain/memory/`)** — durable facts about the
*user*, kept between conversations. The transcript is deliberately in-memory only, and for the
transcript that is right; what it cannot hold is the thing rule 6 of the chat prompt names. The app
does not track income, so the assistant has to ask what is available every single time, and the
answer dies with the sheet. Memory is the only place that number can live.

**The invariant, and the reason the feature exists at all: a memory never stores a figure the app can
compute.** Portfolio maths is runtime-only, the snapshot rides the live question so the model never
sees two generations of net worth, an expense is never restated at today's rate — a row reading "net
worth is 8,700,000" breaks all three, and is worse than the same guess in a transcript because it is
re-injected into every future turn and is wrong by tomorrow. A number is storable only when the
number *is* the fact and nothing can compute it: the monthly investable amount, an expected inflow,
a target age. The second rule is its twin: memory records what the user **is or wants**, never what
they **did** — an action with figures behind it is a `decisions` entry, and a memory impersonating
one is unverifiable and instantly stale. `MemoryCurator.test.ts` pins both prompt rules, because
they are prose and nothing else would catch their removal.

`MemoryKind` is a closed set (preference, constraint, context, correction) rather than free text: it
holds the curator to statements with a durable shape and gives the Settings list something to group
by. There is no `expiresOn` — absolute dates go in the text and the curator prunes what it
supersedes, rather than the app running a second clock.

Writes come from a **background pass, not a tool**. `ChatService.remember` runs after the reply is
already on screen — `ChatContainer` fires it and never awaits it before rendering, because curating
memory costs a request the user did not ask to wait for. It is a separate call rather than an extra
field on the reply envelope: the interesting work is not noticing "I can invest 50,000" but
reconciling it with the 40,000 already stored and deleting what expired, which is a different task
from answering and wants the whole list in front of it. It is given only the **question and the
reply, never the tool traffic** — what is durable is what the user said, and tool results are
nothing but the figures rule 2 bans. `parseMemoryOperations` gates `update`/`delete` on ids that
really exist, the way `parseAssistantTurn` gates tool names, and `MemoryService.applyOperations`
re-validates every operation through the same `validateMemory` the Settings form uses.

The curator writes without asking, which is only defensible because **every write is visible**: a
"Remembered: …" line under the reply that caused it, and a full editable list in Settings. Per-fact
approval would nag the user out of the feature; silent notes about a person would be the wrong trade.
`source` records who wrote a row and drives that label, but it is deliberately **not** a write lock —
freezing text the user had touched would leave a superseded "can invest 40,000" the assistant could
never correct.

The read side goes into the **system prompt, not the snapshot**, and rule 12 and the block are
emitted together or not at all. `runChatLoop`'s stored transcript is `carried + question + durable`
and the system message is never in it, so the block is rebuilt from the table every turn and an
edited memory cannot survive in an earlier turn — the same invariant the snapshot relies on. The
snapshot would have been wrong twice over: it is announced as superseding earlier figures, and memory
is explicitly not a source of figures. An empty section is omitted entirely, heading and rule both,
because a model shown a blank "what you remember" fills it.

`memories` (schema v11) is a table for the same touch points `decisions` needed. The switch,
`ISettings.memory`, is a settings field instead — and the split matters: the background curator
writes only to the table, never to the singleton, so it can never race the user saving an API key
through `saveAiProviderSettings`' read-modify-write. Memories ride sync *and* the plaintext backup,
unlike `ai.apiKey`; the Settings section says so where the user is reading them.

The assistant has no route of its own. It opens as a 92dvh bottom sheet (`ChatSheetView`) whose
state lives in `MainPage`, so the tab underneath stays mounted and dismissing returns the user
where they were with no refetch; the "Ask" FAB in `MainLayout` is the only way in. Replies render
through a hand-written markdown subset (`MarkdownBlocks.ts` → `ChatMarkdownView`) rather than a
library — `react-markdown` and `marked` are both 403 on this project's registry, and a full
renderer would allow HTML passthrough from model output. Names of the user's own assets, loans and
goals are turned into links by `EntityLinks.ts`, detected against the real record list rather than
requested of the model, and conservatively: whole-word, longest-first, nothing under four
characters, never inside code.

Note: `.github/domain-patterns.md` describes a **Scheduled Expenses** context. It is not implemented — there is no such entity, table or service. Treat those sections as aspirational.

Extended domain patterns: `.github/domain-patterns.md`  
Technical standards (lint/TS config): `.github/technical-guide.md`  
Developer workflow: `.github/workflow-guide.md`
