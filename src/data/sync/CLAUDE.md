# Sync

Loaded when working in this directory. Project-wide rules are in the root `CLAUDE.md`.

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

## Testing sync

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
