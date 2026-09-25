# News sentiment

Loaded when working in this directory. Project-wide rules are in the root `CLAUDE.md`.

**News sentiment (`src/domain/news/`, `src/data/news/`)** — `getNewsSentiment` gives the assistant a
*measurement* over recent articles per category, not a headline dump. The distinction is the whole
point: a model handed 50 articles writes a story, and it writes an equally fluent one whichever way
the market moved. A model handed "27 articles, relevance-weighted mean +0.14, Neutral, spanning 40
hours" has a number it can be held to, with the headlines attached so it cites instead of recalling.

AlphaVantage's `NEWS_SENTIMENT` is the source, on one hard criterion: it is the only news feed found
that both sends `Access-Control-Allow-Origin: *` and returns structured sentiment. GDELT rate-limits
anonymous callers and sends no CORS header; publisher RSS is almost universally CORS-blocked. Its
free tier allows **25 requests a day**, and that quota — not latency — shapes the design:

- **One request per fetch, carrying no topic filter at all**, partitioned to categories locally by
  `CATEGORY_TOPICS`. One request per topic would burn a day's quota in a single question — but the
  filter is omitted for a harder reason than cost. **AlphaVantage ANDs a multi-topic filter**: its
  docs say `topics=technology,ipo` returns articles that "simultaneously cover technology and IPO".
  Asking for the union of fifteen topics therefore asks for an article tagged with all fifteen, which
  does not exist, and the provider correctly answers `items: "0"` with an empty feed. That is exactly
  what shipped, and it was invisible: the key authenticated, HTTP 200 came back, `parseNewsResponse`
  read a well-formed empty feed, and every category was reported — honestly — as having no news. The
  filter was never doing the partitioning anyway; each feed item declares its own
  `topics: [{topic, relevance_score}]`, and that is what `summariseCategoryNews` divides on.
  `buildFeedUrl` is exported *solely* so a test can assert the absence of `topics=`, because nothing
  else in the stack can see a query string: not `tsc`, not the parser's tests, not the aggregation's.
- **`NEWS_TOPICS` is a vocabulary, not a query.** Nothing is sent, so it is now the provider's
  published topic list verbatim, and `NewsTopics.test.ts` pins that every `CATEGORY_TOPICS` entry
  falls inside it — a mistyped or remembered topic name would match nothing for ever and look like a
  quiet news day. The earlier rule ("only topics observed in a real response") existed because an
  unrecognised topic could fail the one request there was; with no topic sent, the published list
  governs. That rule was also what kept `economy_monetary` — interest rates and inflation, the topic
  that actually moves Debt and Gold — out of the table.
- **Page size is set for the partition, not the page.** Unfiltered, the provider's default of 50
  articles has to cover fifteen topics between them, leaving most categories under
  `THIN_SAMPLE_BELOW`. `ARTICLE_LIMIT` is 200 (the provider's maximum is 1000); a larger page costs
  nothing extra against the daily quota.
- **An empty feed is never cached.** Unfiltered and sorted by recency, "no market news at all" is not
  a state that occurs — it means the request is wrong, as it was for the whole life of the topic
  filter. Caching it would turn a bug into a silent six-hour news blackout. For the same reason the
  `localStorage` key carries a version (`news.feed.v2`): a bump discards what a broken query cached,
  which is otherwise served as a perfectly valid entry until it ages out.
- **`testConnection` fails on zero articles** rather than reporting `Fetched 0 articles.` as a
  success. The button answers "will the assistant get news?", and a key that authenticates onto an
  empty feed answers no. It rendered its own failure symptom as a green tick for the life of the bug,
  which is worse than having no test button.
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
