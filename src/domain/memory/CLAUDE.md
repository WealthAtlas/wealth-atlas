# Assistant memory

Loaded when working in this directory. Project-wide rules are in the root `CLAUDE.md`.

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
