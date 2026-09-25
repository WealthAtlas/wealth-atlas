# Fund universe

Loaded when working in this directory. Project-wide rules are in the root `CLAUDE.md`.

**Fund universe (`src/domain/funds/`, `src/data/funds/`)** — `screenFunds` and `compareFunds` are
the only tools that can name something the user does **not** own. Every other tool reads their
records, and `getMarketTrends` even defaults to the categories they already hold, so "suggest a fund
I should add" had no source but training memory. That is the worst possible source for this
particular question: schemes get renamed, merged into other funds and wound up, so a remembered name
may be a fund that cannot be bought — quoted with a performance figure as of a date the model cannot
state. Retrieval is the app's job here for the same reason it is in `src/domain/market/`.

The universe is AMFI's published scheme list from the same keyless, `Access-Control-Allow-Origin: *`
mirror the benchmarks come from (`api.mfapi.in`). What that costs shapes the whole design, because
the list cannot be narrowed at the source: there is no category endpoint, `/mf` ignores every query
parameter tried, and `/mf/search` is hard-capped at 15 results however many are asked for. So the
whole ~37,800-scheme, ~5.7MB list is downloaded and segmented locally.

- **Segmentation is by scheme name, and that is sound only because SEBI mandates the category in the
  name.** `FUND_SEGMENTS` was verified against the live list, and each pattern matches on the order of
  one scheme per fund house — which is what SEBI's one-scheme-per-category rule predicts, and what
  tells you a pattern describes a segment rather than something else. `sebiCategoryHint` is
  deliberately **not** a filter: the news layer already paid for that mistake, where a vocabulary
  built from memory matched nothing for ever and read as a quiet news day. The provider's real
  `scheme_category` is reported *beside* the match so the two can be compared.
- **A dead scheme is the failure to design against.** AMFI publishes wound-up schemes indefinitely,
  the list carries no dates, and a merged fund still lists under a name that reads perfectly current
  and still answers with a NAV. The only signal is that NAV's *date* — a live fund publishes every
  trading day. `isStale` (`STALE_AFTER_DAYS`, 30) is what stands between the screen and a
  recommendation to buy something that no longer exists, and it is load-bearing on real data: the
  IDBI Nifty 50 index fund, merged into LIC MF in 2023, still returns a NAV dated 27-07-2023, and a
  live screen of Nifty 50 Index drops three such schemes. An unknown liveness counts as stale — a
  failed metadata lookup is not a licence to suggest the fund.
- **`pruneUniverse` keeps direct-plan growth only.** One fund is listed as up to six schemes — regular
  and direct, growth and two flavours of income distribution — and they are the same portfolio.
  Keeping more than one offers the user the same fund repeatedly and, worse, ranks a regular plan's
  NAV against a direct plan's, which differs by the distributor commission alone. It also cuts the
  list to 5,006 rows and ~370KB, which is what makes the cache fit.
- **The two tools are split by what they cost and by what an ordering implies.** `screenFunds` names
  funds for almost nothing (cached list plus cached per-scheme metadata) and reports **no performance
  figure at all**; `compareFunds` fetches real NAV history and is bounded to ~10 named schemes. A
  segment holds up to ~80 schemes at ~125KB of history each, so screening *with* performance would be
  a 10MB download on a phone — and a segment listed in performance order reads as a ranking of fund
  quality, which trailing NAV growth is not. A model handed a sorted list treats position one as the
  answer, so `sortCandidates` orders by fund house and the figures live behind a shortlist. What
  actually decides between two funds in a segment is largely the **expense ratio**, and the feed
  carries none — nor fund size, manager tenure, exit load or lock-in. Both tool notes and prompt rule
  8i say so rather than letting it be filled in.
- **`screenFunds` defaults to the segments of the categories the user is underweight in**, which is
  what attaches a suggestion to a reason: a fund is worth adding where the policy says they are
  short. With no target set and no segment asked for it returns an empty screen that says to ask,
  and lists `availableSegments` — an invented segment name and a genuinely empty one must never look
  the same.
- **Two caches, in `localStorage`, by the argument `NewsCache` sets out**: a published list of every
  fund on the market is not the user's data — device-local, nothing to add to a sync snapshot, and
  actively wrong to restore from a backup. There is no request quota here (the mirror is keyless),
  but the list is 5.7MB and a segment's first screen costs one small metadata lookup per scheme, both
  of which an in-memory cache would repeat on every launch of an installed PWA. The universe key
  carries a version, like the news feed's, because the pruning rule is applied *before* the write.
  NAV histories stay in memory only, as in `MarketData`: far too large for the storage budget and
  free to refetch. Metadata concurrency is a modest 6 — this is a community mirror with no SLA, and
  the difference between 6 and 80 concurrent requests is invisible to the user but not to the host.
- **No schema change, and that is a property of the design rather than luck.** Nothing here is
  persisted: no instrument identifier was added to `IAsset`, so there is no Dexie version, no
  `SNAPSHOT_VERSION` and no `BACKUP_VERSION` bump. Per-*holding* market data would need one, and
  `Benchmarks.ts` explains why it is refused today — nothing in `IAsset` records a scheme code or
  ticker, so matching a holding to an instrument by name is a guess that attaches a real price
  history to the wrong asset. Discovery needs no such match: it names funds the user does not hold
  yet.

Rule **8i** carries the prose half and only `ChatPromptBuilder.test.ts` can keep it in place: a fund
you remember is not a fund; screening says which funds exist, not which is good; a new fund answers
"where should new money go" and so hangs off 8g rather than replacing it; and a second fund in a
segment already held is usually cost and overlap rather than diversification.

One environment note worth keeping: **jsdom's `fetch` rejects a node-realm `AbortSignal`**, so the
`AbortSignal.timeout` pattern in `MarketSources.ts` — correct in a browser, where both come from one
realm — cannot be exercised under Vitest. That is why the transport here has no test and the pure
half (`FundScreen`, `FundSegments`) has all of it.
