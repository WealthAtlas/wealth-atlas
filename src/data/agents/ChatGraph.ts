import { Annotation, END, Send, START, StateGraph } from '@langchain/langgraph/web';
import { LlmMessage } from '@/data/llm/LlmClient';
import { Memory } from '@/domain/entities/memory/Memory';
import { ChatSnapshot } from '@/domain/chat/ChatContextBuilder';
import { ChatAnswer, ChatToolResult, TurnsChatFn } from '@/domain/chat/ChatLoop';
import { ChatToolContext } from '@/domain/chat/ChatToolContext';
import {
  assembleTranscript,
  ChatProgress,
  draftAnswer,
  MAX_REVISIONS,
  needsModelReview,
  runSpecialist,
  SpecialistFinding,
  untracedFigures,
} from '@/domain/chat/agents/ChatAdviser';
import { SPECIALISTS_BY_ID } from '@/domain/chat/agents/ChatAgents';
import { reviewAnswer, ReviewVerdict } from '@/domain/chat/agents/ChatCritic';
import { RoutePlan, routeQuestion, SpecialistBrief } from '@/domain/chat/agents/ChatRouter';

/**
 * The assistant as a LangGraph state graph:
 *
 *   START → router ─┬─ direct ─────────────────────→ answer → review ─┬→ END
 *                   └─ Send × N → specialist ──────→ answer    ↑      │
 *                                                        └─────┴──────┘ revise, once
 *
 * This is the only file that imports LangGraph, and it holds no logic of its
 * own: every node calls a plain function in `src/domain/chat/agents/`, and the
 * graph decides only what runs next. So the domain layer keeps no external
 * dependency, and each node is testable without the graph at all.
 *
 * The graph is built per question rather than once, because the transport, the
 * tool context and the progress callback are closed over — none of them is
 * serialisable state, and there is no checkpointer, deliberately: a
 * conversation is in-memory only and belongs to the container that holds it.
 *
 * `Send` fans the specialists out in one superstep, so they run concurrently
 * and `answer` runs once, after all of them, with their findings merged by the
 * `findings` reducer.
 */

export interface ChatGraphArgs {
  chat: TurnsChatFn;
  context: ChatToolContext;
  snapshot: ChatSnapshot;
  history: LlmMessage[];
  question: string;
  memories: readonly Memory[];
  signal?: AbortSignal;
  onProgress?: (progress: ChatProgress) => void;
}

function append<T>() {
  return Annotation<T[]>({ reducer: (left, right) => left.concat(right), default: () => [] });
}

const ChatState = Annotation.Root({
  plan: Annotation<RoutePlan>(),
  /** Set only on a specialist's own `Send` input. */
  task: Annotation<SpecialistBrief | undefined>(),
  findings: append<SpecialistFinding>(),
  /** Every draft the adviser wrote, the last one being the answer. */
  drafts: append<ChatAnswer>(),
  /** The last review's outcome. Not `review`: LangGraph forbids a channel named like a node. */
  verdict: Annotation<ReviewVerdict | undefined>(),
  /** Warnings from the router, the specialists and the review; not the drafts'. */
  warnings: append<string>(),
});

type State = typeof ChatState.State;

function gatheredBefore(state: State, draftIndex: number): ChatToolResult[] {
  return [
    ...state.findings.flatMap(finding => finding.toolResults),
    ...state.drafts.slice(0, draftIndex).flatMap(draft => draft.toolResults),
  ];
}

function buildGraph(args: ChatGraphArgs) {
  const { chat, context, snapshot, history, question, memories, signal, onProgress } = args;

  return new StateGraph(ChatState)
    .addNode('router', async () => {
      onProgress?.({ stage: 'planning' });
      const { plan, warnings } = await routeQuestion({ chat, history, question, signal });
      return { plan, warnings };
    })
    .addNode('specialist', async (state: State) => {
      const task = state.task;
      const specialist = task ? SPECIALISTS_BY_ID.get(task.agent) : undefined;
      if (!task || !specialist) return {};

      const finding = await runSpecialist({
        chat,
        context,
        snapshot,
        specialist,
        brief: task.brief,
        signal,
        onProgress,
      });
      return { findings: [finding], warnings: finding.warnings };
    })
    .addNode('answer', async (state: State) => {
      const previous = state.drafts[state.drafts.length - 1];
      const revision =
        previous && state.verdict?.verdict === 'revise'
          ? { draft: previous.reply, issues: state.verdict.issues }
          : undefined;

      const draft = await draftAnswer({
        chat,
        context,
        snapshot,
        history,
        question,
        memories,
        findings: state.findings,
        evidence: gatheredBefore(state, state.drafts.length),
        revision,
        signal,
        onProgress,
      });
      return { drafts: [draft] };
    })
    .addNode('review', async (state: State) => {
      const draft = state.drafts[state.drafts.length - 1];
      const evidence = [...gatheredBefore(state, state.drafts.length - 1), ...draft.toolResults];
      const untraced = untracedFigures(draft.reply, {
        snapshot,
        history,
        question,
        memories,
        evidence,
      });

      // The revision is final: it gets the free code check, and anything still
      // untraced is said under the reply rather than sent round again.
      if (state.drafts.length > MAX_REVISIONS) {
        return {
          verdict: { verdict: 'pass' } as ReviewVerdict,
          warnings:
            untraced.length > 0
              ? [`Some figures could not be traced to your records: ${untraced.join(', ')}.`]
              : [],
        };
      }

      if (!needsModelReview(state.plan, untraced)) {
        return { verdict: { verdict: 'pass' } as ReviewVerdict };
      }

      onProgress?.({ stage: 'reviewing' });
      const { verdict, warnings } = await reviewAnswer({
        chat,
        question,
        draft: draft.reply,
        consulted: evidence.map(result => result.name),
        untraced,
        signal,
      });
      return { verdict, warnings };
    })
    .addEdge(START, 'router')
    .addConditionalEdges(
      'router',
      (state: State) =>
        state.plan.route === 'specialists'
          ? state.plan.briefs.map(task => new Send('specialist', { ...state, task }))
          : 'answer',
      ['specialist', 'answer']
    )
    .addEdge('specialist', 'answer')
    .addEdge('answer', 'review')
    .addConditionalEdges(
      'review',
      (state: State) =>
        state.verdict?.verdict === 'revise' && state.drafts.length <= MAX_REVISIONS
          ? 'answer'
          : END,
      ['answer', END]
    )
    .compile();
}

/**
 * Runs one question through the graph and returns it in the shape the single
 * loop always has, so `ChatService` and the container see no difference beyond
 * a richer trace.
 */
export async function runChatGraph(args: ChatGraphArgs): Promise<ChatAnswer> {
  const state = await buildGraph(args).invoke({}, { signal: args.signal });

  const final = state.drafts[state.drafts.length - 1];
  const gathered = gatheredBefore(state, state.drafts.length - 1);

  return {
    reply: final.reply,
    toolTrace: [
      ...state.findings.flatMap(finding => finding.toolTrace),
      ...state.drafts.flatMap(draft => draft.toolTrace),
    ],
    warnings: Array.from(new Set([...state.warnings, ...final.warnings])),
    transcript: assembleTranscript(final, gathered),
    toolResults: [...gathered, ...final.toolResults],
    turns: final.turns,
  };
}
