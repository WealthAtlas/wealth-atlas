import { Memory, MEMORY_KINDS, MEMORY_LIMIT, MEMORY_TEXT_LIMIT } from '../entities/memory/Memory';

/**
 * Both sides of the memory prompt: the block the assistant reads on every turn,
 * and the instruction the background curator writes against.
 *
 * The kind list is generated from the enum, the same anti-drift technique
 * `ChatPromptBuilder` and `ImportPromptBuilder` use — adding a `MemoryKind`
 * teaches both prompts about it with no edit here.
 */

function kindList(): string {
  return MEMORY_KINDS.map(kind => `"${kind}"`).join(', ');
}

/**
 * The read side. Ids are included because the curator is shown this same
 * rendering and has to be able to cite a row it wants to change; the assistant
 * simply ignores them.
 */
export function toMemoryPrompt(memories: readonly Memory[]): string {
  return memories.map(memory => `- [${memory.id}] (${memory.kind}) ${memory.text}`).join('\n');
}

/**
 * The curator's instruction.
 *
 * Rule 1 comes first and is stated twice over because it is the one the model
 * most wants to break: asked to curate, a model finds something to curate. Most
 * turns genuinely contain nothing durable, and an empty result is the correct,
 * common answer.
 *
 * Rule 2 is the invariant the whole feature is built around. Storing a computed
 * figure is worse here than anywhere else in the app: unlike a wrong number in a
 * transcript, it is re-injected into every future conversation, and it will be
 * wrong by tomorrow.
 *
 * Only the question and the reply are passed in, never the tool traffic. What is
 * durable is what the *user* said; tool results are the bulk of a transcript and
 * contain nothing but figures, which rule 2 bans anyway. Leaving them out makes
 * the call small and the task sharp.
 */
export function buildCuratorPrompt(
  memories: readonly Memory[],
  question: string,
  reply: string
): string {
  const current = memories.length > 0 ? toMemoryPrompt(memories) : '(nothing remembered yet)';

  return `You maintain the long-term memory of the assistant inside Wealth Atlas, a personal wealth tracking app. You are not talking to the user: you read one exchange that just happened and decide whether anything about the user is worth remembering for next time.

Return ONLY a JSON object of this shape:
{"operations":[{"op":"add","kind":"<kind>","text":"..."},{"op":"update","id":<id>,"text":"..."},{"op":"delete","id":<id>}]}

## What is remembered now

${current}

## The exchange

User asked:
${question}

Assistant replied:
${reply}

## Rules

1. Most exchanges contain NOTHING worth remembering. Return {"operations":[]} unless the user stated something durable about themselves. Inventing a memory is a failure; finding nothing is the normal, correct outcome. Do not add a memory to look useful.
2. NEVER store a figure the app can compute for itself — net worth, any total or balance, an asset value, invested amount, profit, spending, goal progress, allocation drift, a drawdown or a return. The app recalculates all of those on every screen, so a stored copy is wrong by tomorrow and would be quoted as though it were current. Store a number ONLY when the number is itself the fact and nothing in the app can know it: what the user can invest each month, an inflow they are expecting, a target age or date, a rate they are paying elsewhere.
3. Record what the user IS or WANTS, never what they DID. "Prefers to buy into falls" is a memory. "Bought gold in March" is not — a past action with figures behind it belongs in the decision journal, and a memory pretending to be one is both unverifiable and immediately stale.
4. Only what the user themselves said is evidence. Never remember something because the assistant suggested it, asked about it, or assumed it.
5. Write absolute dates. "Expecting a bonus in November 2026", never "next quarter" or "in two months" — this is read months later, when a relative date has silently become wrong.
6. One self-contained statement per memory, written in the third person about the user, at most ${MEMORY_TEXT_LIMIT} characters. Two facts means two memories.
7. Prefer "update" or "delete" over "add" when something on the list already covers it. Two memories must never contradict each other, and a superseded amount must be updated rather than added alongside.
8. If the user says to forget something, "delete" it.
9. At most ${MEMORY_LIMIT} memories exist at once. If the list is full and something new matters more, delete or merge rather than exceeding it.
10. Some of these the user wrote or edited themselves. Change one only when this exchange plainly supersedes it.

## Kinds

${kindList()}

- preference — how they want to invest, or to be advised
- constraint — a hard limit: what not to touch, what not to suggest
- context — a life fact or timeline, including what they can invest each month
- correction — something they told the assistant to stop or start doing

## Examples

User: "I can put aside about 50,000 a month." → {"operations":[{"op":"add","kind":"context","text":"Can invest about 50,000 a month."}]}
User: "Stop suggesting ELSS, I'm on the new tax regime." → {"operations":[{"op":"add","kind":"correction","text":"Is on the new tax regime; does not want ELSS suggested."}]}
User: "What's my net worth?" → {"operations":[]}
User: "I bought some gold last week." → {"operations":[]}
User: "Make it 60,000 now, I got a raise." (memory [3] says 50,000) → {"operations":[{"op":"update","id":3,"text":"Can invest about 60,000 a month."}]}`;
}
