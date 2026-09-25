# Decision journal

Loaded when working in this directory. Project-wide rules are in the root `CLAUDE.md`.

**Decision journal (`src/domain/entities/journal/`, `src/domain/journal/`, `/journal` route)** — the
piece that makes the assistant's market reasoning (`src/domain/market/`, `src/domain/news/`) falsifiable. Drift, drawdown and sentiment can each build a
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
than the version bumps — see the new-table touch-point list under Persistence invariants in the root `CLAUDE.md`. Missing `clearAllData`
in particular is silent: a restore would `bulkAdd` onto the existing journal and collide on ids.
