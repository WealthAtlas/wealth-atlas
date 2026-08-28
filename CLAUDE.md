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
- `src/data/` — Repository pattern over Dexie. Schema migrations (`migrations/`), optional sync to a configurable AWS API (`VITE_SYNC_API_URL`), LLM provider transport (`llm/`).
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
  write (`CalendarDateFields.ts`), for the same reason they maintain `uid`/`updatedAt` — so no
  repository can forget.

  The rule exists because mixing the two readings drifts the *day*, and drifts it differently on each
  device. A date input yields `YYYY-MM-DD`, which `new Date(...)` reads as UTC midnight, while
  `setMonth`, `getMonth` and `toLocaleDateString` all work in the browser's zone. That is one bug with
  four faces, and none of them is visible at or ahead of UTC, which is why it survived: a monthly SIP
  starting 1 Jan walked 1 Jan → 3 Mar → 2 Apr in New York; an occurrence landed an hour before the
  end date it was meant to equal under BST; a 1 Jan expense displayed as 31 Dec; and — *in IST* —
  `ExpenseChartsView`'s bucket key disagreed with `monthKey` about which month an expense belonged to,
  because `new Date(y, m)` is local midnight and serialises into the previous month.

  Machine timestamps are **not** calendar dates and keep their time. `updatedAt` and
  `deletions.deletedAt` are what a merge compares to order two writes: truncated to a day, every
  same-day edit on two devices becomes a tie, which `localAhead` reads as "in step", so neither device
  publishes and both keep a different row for ever. The `*UpdatedAt` value stamps drive one-day
  staleness checks where the time of day *is* the content, and `createdAt`/`reviewedAt` record when
  something happened rather than which day it is for. `CalendarDateFields.ts` lists what is a day and
  says why each instant is excluded; that comment is the load-bearing part.

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
- Any change to a persisted row shape needs a Dexie `version()` bump in `src/data/database.ts`, a transform in `src/data/migrations/`, a `SNAPSHOT_VERSION` bump in `src/data/sync/Syncer.ts`, and a `BACKUP_VERSION` bump in `BackupService` — all four, or a sync/restore will corrupt data. A new *table* needs nine (see `decisions`/`memories` below), and a new *synced entity* table also needs a row in `SYNCED_TABLES` — without it the table is never merged, so every edit to it is settled by whichever device pushes last.
- A write that changes nothing claims nothing. `isNoOpUpdate` gates both the `updatedAt` stamp and the push: a dialog hands back the row it was given, so pressing Save without editing fires the `updating` hooks with no change in them, and the row used to come out re-dated with a push armed behind it. That made a device holding *older* data the "latest change" — merely opening a record and saving it beat a real edit made elsewhere, and last-write-wins then did exactly as it was told. `uid` and `updatedAt` are excluded from the comparison, being the bookkeeping under decision rather than the content being judged.
- A synced row is deleted through `deleteSynced`, never `table.delete` or a collection delete. The delete and its tombstone have to land in one transaction, or the row comes back on the next merge.
- Rows arriving via JSON (backup, sync snapshot) must go through `rehydrateSnapshotDates` before being written; otherwise Date columns land as strings.
- Every preference the Settings page edits lives in the `settings` singleton (`ISettings`), so it travels through sync and backup: base currency, the currency list (rates in `currencyRates`), and the AI provider config (`settings.ai`). Only the sync identity itself is device-local — key id, passphrase, auto-sync toggle in `src/data/sync/state.ts`. `settings.ai.apiKey` is the one exception to symmetry: it rides the encrypted sync snapshot but `BackupService` strips it from the export, because that file is plaintext on the user's disk.
- `src/data/llm/state.ts` reads `settings.ai` from a synchronous in-memory cache filled in Dexie's `ready` handler. Any code path that replaces the settings row (sync pull, backup restore) must call `hydrateAiProviderSettings()` afterwards.
- `AutoSyncService.startListening()` hooks a hardcoded table list. A new table has to be added there too, or edits to it never wake a push. Wrap a write that is a migration rather than a user decision in `AutoSyncService.withoutScheduling` so it does not race the device's own first pull. Keep that wrapper around **writes, never around waiting**: suppression is a process-wide depth counter, not something scoped to the work that asked for it, so anything it spans is claimed as automatic — a user's edit made inside the window included, and such an edit gets neither a new `updatedAt` nor an unpushed mark, so the next merge overwrites it with no trace that it existed. `App`'s startup block therefore suppresses only the SIP/EMI conversions, and `AssetService.updateValue` runs its value script outside the wrapper and suppresses just the write it ends with.
- A sync pull and a backup restore replace every table at once, but containers hold what they read on mount. Both paths call `emitDatabaseReplaced()`; anything holding synced state subscribes with `useDatabaseReplaced` (or `useDatabaseVersion` when it reads live during render). A container whose loader depends on `converter` from `useCurrency` already re-runs, because `CurrencyProvider` subscribes. A container with an editable draft must not clobber unsaved input — adopt the new value only when the draft is clean.

**Sync conflicts (`src/data/sync/conflict.ts`, `recovery.ts`)** — sync is whole-snapshot
replacement in both directions, because the backend holds one opaque encrypted blob behind a version
counter and cannot merge what it cannot decrypt. That makes every sync operation a potential deletion
of a whole database, and the client is the only place it can be caught. It once was not caught at
all: `push` PUT the snapshot with no precondition, so a device that had been offline for a day needed
one edit to replace the cloud with its stale copy, and the device that had done the work then pulled
that copy over itself — two silent whole-database deletions from one edit.

Four rules hold the line, and they are the whole design:

- **A push may only overwrite the version it was based on.** The API's PUT takes no expected version,
  so `decidePush` is a compare-and-swap the client performs itself: read the remote version, compare
  against `lastRemoteVersion`, write only if they match. What is left is a race of one request
  between two devices pushing in the same breath — not the multi-day staleness window that actually
  loses data. An unknown base is a conflict, not a push: a device that cannot say what it is based on
  cannot claim to be current. `requireRemoteVersion` falls back to a full GET on backends predating
  `/version`, because for a push "could not tell" must never mean "go ahead".
- **A replace asks; only a merge may act silently.** The line is not how likely the app is to be
  right, it is what being wrong costs. A merge removes rows silently because every row it removes has
  a tombstone naming the delete that did it — *nothing disappears without a recorded reason*. A
  replace has no per-row reason for anything; it removes whatever the other copy happens not to have,
  so the only honest question is which copy the user wants. `decidePull` therefore refuses on
  `hasLocalRecords` — counted, not inferred — and an empty device still imports without asking,
  because there is nothing to weigh. `markPendingChange` still counts, but it now only ever *adds*
  caution: it is cleared by any completed push, and never set for a write made while automatic work
  held the suppression flag, so a flag that can be wrong in the permissive direction cannot be the
  only thing standing between the user and a wiped database. Writes that
  are not the user changing their mind — the startup SIP/EMI conversions, a migration — go through
  `AutoSyncService.withoutScheduling` so they neither push nor set the mark; otherwise the device
  that opens second would conflict on every launch.
- **Nothing destructive runs without a recovery copy.** `recovery.ts` files the losing copy before
  every wipe, and `preserveDevice` *throws* rather than logging — no net, no wipe. Each copy is
  exactly a backup file (`BackupService.toBackupFile`, the one writer for the format), so recovery is
  the Import Data flow the user already has rather than a rescue path nobody has run. It lives in its
  own IndexedDB database, not a Dexie table: it is device-local wreckage rather than the user's
  records, so it belongs in no sync snapshot, and staying out of Dexie's schema means it needs none
  of the nine touch points a real table does.
- **Pull and push never interleave.** `runExclusive` serialises every remote operation. The poll
  fires on a timer, on `visibilitychange` and on `online`, any of which could land inside the 2s push
  debounce — and compare-and-swap cannot help there, because both halves are the same device.
  `importSnapshot` also runs under `withoutScheduling`, because `bulkPut` fires the `creating` hooks:
  without it every pull armed a push of what it had just imported.

**An older build in the mesh** is refused rather than absorbed, and most of that guard was already
standing. An older build refuses to *read* a snapshot newer than itself (`upgradeSnapshot`'s
"newer than this app"), and its push is refused by the same compare-and-swap as anyone else's, so a
device left alone locks itself out with a conflict showing. The hole is a user answering that lockout
with "keep this device", which forces the older shape over the newer one — and it cannot be closed
there, because that build is already installed and will never run a check added now. So it is closed
on the far side: `getHighestSnapshotVersion` records the highest `schemaVersion` this device has read
from this key, and `guardAgainstDowngrade` refuses anything below it. A snapshot merely older than
the app is normal and still migrates forward; one older than this device has *already read* can only
mean the blob was overwritten by a build that has no field for what it dropped — every tombstone, so
deleted rows come back, and the lineage, so every device drops to replacing. That is a
`SyncDowngradeError` and a `kind: 'downgrade'` conflict record, and the card deliberately offers **no
buttons**: "use the cloud copy" is the one answer that loses the rows, and "keep this device" leaves
the other one pushing the same downgrade on its next edit. The only fix is updating that device, so
the card says so and sync resumes on its own. The floor is cleared by `unlink` and by `linkSync`,
because a different key has its own history.

**Reading the cloud without taking it** (`SyncService.inspectRemote` / `downloadRemoteCopy`,
`CloudCopyView`). Push replaces the cloud, Pull replaces the device, and
resolving a conflict replaces one side or the other — so until these existed, the question a user
actually has when records go missing (*is my data still up there?*) could only be answered by
performing the very thing they were afraid of. Both are read-only on both sides, and the counts are
reported **per table** because that is what answers it: an assets count of 0 and one of 34 are
different situations and neither is visible from a version number.

A refused sync is a `SyncConflictError` and a persisted `SyncConflict` record, never a silent stop:
the background push swallows the throw, so the banner in `MainLayout` and the card in Settings are
what stop "sync quietly stopped working" from being the new failure. Resolution is the user's
decision between two named copies (`resolveConflict`), because without row-level `updatedAt` and
tombstones the app cannot merge and must not pretend to. That merge is the obvious next layer; until
it exists, a conflict is a question, not an inference.


**Row-level merge (`src/data/sync/merge/`)** — what makes two devices editing at once a non-event
rather than a question. Refusing a destructive sync (above) stopped the silent deletions, but it could
not *resolve* the common case: two devices adding different expenses do not contradict each other, and
a user asked to pick a copy loses one of them either way. Merging is that case handled properly.

The rule, in the two halves the user asked for. **Not overlapping: keep both** — a row only one side
has survives, whichever side that is. **Overlapping: the latest change wins** — both edited one row,
so there is no answer to derive, only a policy, and the later `updatedAt` is it. `MergeRows.ts` is
that rule, pure and tested; everything else in the directory is plumbing.

`localAhead` is a third answer the same comparison has to give, and it needs the *strict* one: a row
is owed to the cloud only when the local stamp is strictly later. An equal stamp is the same write on
both sides — the ordinary state of every row the moment a merge finishes — so reading a tie as "ahead"
had each device publish the snapshot it had just merged and the other merge and publish that, on every
poll for ever. Paired with an unset lineage, each of those pushes was another whole-database replace
on the far side, which is how the two defects compounded into rows disappearing.

Row-level, not field-level, and deliberately: per-field timestamps would let two edits to *different
fields of one asset* both survive, at the cost of a stamp per column on every table. Two people
editing one record within moments is the rarest case here, and the cost would be paid on every row
for ever.

A delete is an **event with a time**, not a special case — which is the whole reason
delete-versus-edit needs no rule of its own. `sideOf` reduces each side to "alive at T" or "deleted at
T" and the same comparison settles it: a tombstone newer than the incoming row removes it, an edit
newer than the tombstone brings the row back. `deleteSynced` is therefore the only way a synced row is
deleted, and the tombstone is written in the delete's own transaction — a tombstone that a crash can
lose is exactly the case that resurrects a row, and "it came back on its own" is a worse bug than the
one merging fixes, because the user cannot tell it happened. `TOMBSTONE_RETENTION_DAYS` is a
judgement, not a derivation: a tombstone is only safely droppable once every device has seen it, and
the devices are anonymous to each other.

Three things had to exist before any of it could work, and each is load-bearing:

- **`uid`.** Dexie's `++id` counters are per-device, so two devices editing offline both mint asset
  `7`, for different assets. Whole-snapshot replacement hid this because only one device's rows ever
  survived; a merge keyed on `id` would silently fuse unrelated records. `uid` is the cross-device
  identity — except for the two tables that have a real one already: `settings` is a singleton at a
  fixed id (and therefore *always* overlapping, so only ever last-write-wins), and `currencyRates` is
  keyed by `code`, where merging on uid would try to write two INR rows and abort the transaction on
  the `&code` index.
- **Foreign-key remapping.** An incoming `assetId: 7` means "the asset that is 7 *over there*". Every
  reference is translated through the parent's identity, which is why `SYNCED_TABLES` is ordered
  parents-first. A required reference that resolves to nothing means the parent was deleted elsewhere,
  and the row is dropped rather than written pointing at nothing; an optional one is cleared, because
  a transaction outlives the SIP that generated it.
- **The lineage (`Snapshot.lineage`).** The one precondition for merging, and it cannot be inferred
  from versions or timestamps: uids are minted per device, so two devices that upgraded independently
  call the same asset by different uids. Merging across that would insert every one of the other
  device's rows alongside this device's own — a *doubled* database, which is harder to recover from
  than a replaced one. So a device merges only against the lineage it has adopted; a new one is minted
  by whoever declares their rows canonical (`setupSync`, or resolving a conflict in this device's
  favour), and everyone else replaces once before they can merge. Existing multi-device users
  therefore see exactly one conflict prompt after upgrading, and the card says so.

  "Once" is only true because **a snapshot never names an empty lineage**. The lineage is a new key
  in local storage and nothing backfills it, so a device that was already linked before merging
  existed has none — and publishing that `undefined` unset the lineage in the cloud, after which
  `mergeAllowed` refused *every* snapshot. Each sync fell back to a whole-database replace, which
  keeps only what the cloud already holds, so a device lost whatever it alone had; and two such
  devices never escaped, because each import minted a lineage locally (`snapshot.lineage ?? newUid()`)
  that the cloud was never told about, so the next snapshot mismatched again. `requireMergeLineage`
  in `exportSnapshot` is the fix: a push declares this device's rows canonical for the version it
  writes, so it must name the uid space they are in. Minting there cannot fuse two uid spaces — a
  device that has a lineage keeps it, and a device that has none has never adopted anyone else's
  rows.

Sync metadata is **not on the domain interfaces**. `IAsset` describes an asset; when it was last
written and what a second device calls it are facts about *syncing* one. The tables are typed
`Synced<T>`, the Dexie hooks in `database.ts` maintain the columns so no repository can forget them,
and nothing above the data layer knows they exist. Those hooks also read
`AutoSyncService.isSuppressed()`, and that is not a convenience: the flag already means "not the user
changing their mind", and such a write must not claim to be the latest change either. `updateValues()`
runs on every launch, so bumping every asset's `updatedAt` would let *merely opening the app* outrank
a real edit made on another device an hour earlier. It is also why `applyMerge` runs suppressed — an
incoming row has to keep the time the other device wrote it, or it arrives dated "now" and wins for
ever.

`reconcile()` replaces push-on-change as what everything automatic calls: merge, then publish the
result if the merge left this device ahead. That publish is still a compare-and-swap, so another
device pushing mid-merge is answered by merging again (`MAX_RECONCILE_ATTEMPTS`) rather than by asking
the user — simultaneous edits are precisely what merging exists to not ask about. Push and Pull remain
as explicit overrides that replace one side wholesale, and the Settings caption says so.

Three things a merge deliberately does *not* do, each because the simpler behaviour is also the
better one. It files no recovery copy: the only rows it removes are ones another device deleted on
purpose, and the app files no copy when the user deletes an asset on this device either — which is
also what keeps `recovery.ts` to one retention number instead of a per-operation quota. It does not
retry its own publishing push: that push is still a compare-and-swap, but a device that pushed during
the merge has raised the same mergeable divergence again, so it is logged and left for the next
reconcile rather than put in front of the user as a choice of copies (`recordConflict: false`). And it
does not sweep local rows left pointing at a parent it removed — the case where this device added a
transaction to an asset another device deleted. Such a row is unreachable through every query that
goes via its parent, so it is dead weight rather than corruption, and scanning several tables for it
on every merge cost more than the row does. Only *incoming* rows with an unresolvable required
reference are dropped, because there is no local id to point them at.

The one limit worth stating plainly: `updatedAt` comes from each device's own clock, so "latest" is
only as good as the skew between them. A Lamport counter would fix the ordering and lose the ability
to say *when*.

**A merge that costs something is confirmed, not performed** (`applyMerge`'s `dryRun`,
`raiseMergeConfirmation`, `SyncService.confirmMerge`). The line is cost, not divergence, and the
distinction is the whole design. Two devices holding different records is the *ordinary* state of one
person with a phone and a laptop; a merge that only adds rows takes nothing from anybody, and asking
there would be a prompt on almost every session — which trains the user to click through it and
spends the one moment of attention that matters. A merge that *replaces* a local row is a different
thing: merging is row-level, so a replacement carries the whole incoming row, and a device read
before it was refreshed writes stale fields forward under a fresh timestamp. Nobody chose to discard
those values.

So **overwrites ask; removals do not**, and the asymmetry is deliberate: a removal carries a
tombstone naming the delete behind it, so someone chose it on purpose on another device, and asking
would nag every device about every deletion. Removals are still *listed* when the question is asked
for another reason, because they are part of what is being agreed to.

The preview is the real merge with its writes withheld (`dryRun`), never a second implementation of
it — a preview computed twice is a preview of something else. Note `dryRun` still mints placeholder
ids into the id map, or a child whose parent arrives in the same snapshot resolves against nothing
and previews as an orphan the real merge would have kept. `confirmMerge` re-reads and re-merges
rather than applying the stored plan: the cloud may have moved while the card was open, and applying
a plan computed against a snapshot that is no longer there is exactly how a confirmation becomes the
overwrite it was asked about. Impacts are labelled as the user knows the record (`name`, then
`description`, `code`, `text`, `category`) and capped at `MAX_LISTED_IMPACTS`, because the record
lives in local storage.

**Ordering at startup.** Editing a record this device has not caught up on is the sequence that
loses data without either side doing anything wrong: the screen shows a stale value, the write
carries the *whole row* — stale fields included — under a fresh `updatedAt`, and row-level
last-write-wins prefers it. So `App` runs the open-sync *before* `updateValues()`, not after. It used
to wait on one value script per asset over the network, leaving the app interactive for seconds while
still showing what another device had already changed. `updateValues()` is now fired unawaited: it
refreshes prices and says nothing about the other devices, so nothing should wait on it.

The residual case — deliberately editing a stale device before it syncs — is caught at merge time by
the confirmation above rather than by blocking input, because blocking would break offline use to
prevent something the confirmation already catches.

**Starting up (`src/index.tsx`, `AppFailureBoundary`, `AppFailureView`)** — the app must never show
a blank page, and the reason is not polish. Records live in this device's IndexedDB, so a blank page
with no explanation leaves "clear the site data" as the only remedy a user can find unaided — and
that deletes every asset, transaction and expense, plus the `recovery.ts` copies kept for exactly
this kind of problem. A failure to *read* then becomes a permanent loss, by the user's own hand, with
the app never having said a word. Telling them not to clear storage is the load-bearing sentence on
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

**Testing:** Only complex domain logic (Vitest). Skip UI and repository tests. Schema migrations are covered too — they are pure and high-risk.

Sync is the one exception, and deliberately: `MergeIntegration.test.ts` and `SyncE2E.test.ts` drive the
real Dexie store (through `fake-indexeddb`) and the real `SyncService` against a fake backend as dumb
as the real one. The rule is unit-testable and is unit-tested, but the failures that actually lose data
live in the wiring — a hook that re-dates a row, a delete that leaves no tombstone, a foreign key
trusted instead of translated — and none of them are visible to `tsc`, to the build, or to a test of a
pure function. `SyncE2E` simulates two devices by capturing and restoring the store *and* the local
sync state, which is all a device is as far as sync is concerned. It already earned its place: it
caught `BackupService` restoring rows through an unsuppressed `bulkAdd`, which stamped every one with
the time of the restore and would have had a just-recovered device silently overwrite newer edits on
every other device.

Note the trap it found, because it applies to every write that is not a user's edit. The metadata
hooks fire for `bulkAdd`/`bulkPut` *and* for the `Collection.modify` calls that schema upgrades are
made of, so any path replaying rows that already carry their own `updatedAt` must run inside
`AutoSyncService.withoutScheduling` — a backup restore, a sync import, a merge, and every
`version().upgrade()` handler, which is what the `migration()` wrapper in `database.ts` is for.
Unwrapped, an upgrade dates every row with the moment the new build was installed, so *merely
installing it* makes that device outrank every real edit on every other one, and `stampRowToV12`'s
deliberate epoch never survives the write. `v12.upgrade.test.ts` opens a real v3 and a real v11 store
and pins the whole chain, because the pure migration test cannot see what Dexie does to its output.

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
silently shorten it. Prompt rules 8a/8b hold the line: a drawdown is never a forecast, and a market
figure never decides a buy on its own.

`AllocationDrift.ts` is the piece that *does* size a decision — actual share against intended share,
with a tolerance band — and it is what `getAllocationDrift` answers from. News does not decide;
drift decides, and a drawdown only says whether a gap is a cheaper entry or a thesis that changed.

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
sentiment explains a move that has already happened and never decides a trade, and the useful reading
is the four-way combination of drift, drawdown and sentiment.

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

`decisions` (schema v10) is the **first new table since v5**, and so the first change to need more
than the four version bumps. Nine places: `database.ts` (`Table` field, `version(10).stores`,
`ALL_TABLES`), `AutoSyncService.startListening()`, `rehydrateDates` `DATE_FIELDS`, `sync/types.ts`,
`Syncer` (version, upgrade step, snapshot build, transaction list, `clear`, `bulkPut`) and
`BackupService` (version, `BackupData`, export, upgrade, `clearAllData`, `bulkAdd`). Missing
`clearAllData` in particular is silent: a restore would `bulkAdd` onto the existing journal and
collide on ids.

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

`memories` (schema v11) is a table for the same nine touch points `decisions` needed. The switch,
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
