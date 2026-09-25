# Market context and target allocation

Loaded when working in this directory. Project-wide rules are in the root `CLAUDE.md`.

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

`validateTargetAllocation` rejects the whole set, not each row: over 100% is unholdable and would
make every drift figure wrong, while under 100% is allowed and reported as `untargeted` — a policy
covering part of the portfolio is a choice, not an error. The snapshot carries only the rows *outside*
their band, because it is resent on every turn.
