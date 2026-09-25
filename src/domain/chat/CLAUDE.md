# Assistant

Loaded when working in this directory. Project-wide rules are in the root `CLAUDE.md`.

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

**How the assistant is allowed to act on the market, news and drift tools (`ChatPromptBuilder`, "Who you are" + rules
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

The assistant has no route of its own. It opens as a 92dvh bottom sheet (`ChatSheetView`) whose
state lives in `MainPage`, so the tab underneath stays mounted and dismissing returns the user
where they were with no refetch; the "Ask" FAB in `MainLayout` is the only way in. Replies render
through a hand-written markdown subset (`MarkdownBlocks.ts` → `ChatMarkdownView`) rather than a
library — `react-markdown` and `marked` are both 403 on this project's registry, and a full
renderer would allow HTML passthrough from model output. Names of the user's own assets, loans and
goals are turned into links by `EntityLinks.ts`, detected against the real record list rather than
requested of the model, and conservatively: whole-word, longest-first, nothing under four
characters, never inside code.
