import { ChatSheetView } from '@/app/components/views/ChatSheetView';
import { LinkableEntity, LinkTarget } from '@/domain/chat/EntityLinks';
import { useCurrency } from '@/app/components/providers/CurrencyContext';
import { useNotification } from '@/app/components/providers/NotificationContext';
import { useDatabaseVersion } from '@/app/utils/useDatabaseReplaced';
import { ChatComposerView } from '@/app/components/views/ChatComposerView';
import { ChatMessageView, ChatThreadView } from '@/app/components/views/ChatThreadView';
import { LlmError, LlmMessage } from '@/data/llm/LlmClient';
import { ChatService } from '@/domain/services/ChatService';
import { Logger } from '@/domain/utils/Logger';
import { Alert, Box, Button, Paper, Stack } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * The conversation lives in component state only. A reload starts a fresh
 * session, which is the point: each question set is its own scenario, and there
 * is nothing here worth a Dexie table, a migration and the snapshot and backup
 * version bumps that would have to move with it.
 */

const SUGGESTIONS = [
  'How is my portfolio doing?',
  'Where is my money concentrated, and is that a risk?',
  'Why has my spending changed over the last three months?',
  'What should I put money into next month?',
];

export interface ChatContainerProps {
  open: boolean;
  onClose: () => void;
  /** Tab switching belongs to MainPage, which owns the current tab. */
  onNavigate: (target: LinkTarget) => void;
}

export function ChatContainer({ open, onClose, onNavigate }: ChatContainerProps) {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { converter } = useCurrency();
  const chatService = useMemo(() => new ChatService(), []);

  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeTool, setActiveTool] = useState<string | undefined>(undefined);
  const [entities, setEntities] = useState<LinkableEntity[]>([]);

  const abortRef = useRef<AbortController | undefined>(undefined);
  /**
   * Separate from `abortRef` on purpose. Stopping or clearing the conversation
   * must not discard a memory the exchange already earned — the reply has landed
   * and what the user said about themselves is still true. Only unmounting
   * cancels it.
   */
  const rememberRef = useRef<AbortController | undefined>(undefined);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(1);

  /**
   * The conversation as the model sees it: questions, replies, and the tool
   * calls and results behind them. Written by the loop and handed straight back,
   * so a follow-up can build on what the last answer was computed from instead
   * of starting the lookups again. A fresh snapshot is still attached to each
   * live question, so no stale figure travels with it.
   */
  const history = useRef<LlmMessage[]>([]);

  // Read live rather than held in state, so a pull that changes the provider has
  // to reach this render.
  useDatabaseVersion();
  const configured = chatService.isConfigured();

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Abandon in-flight work if the page goes away mid-answer.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      rememberRef.current?.abort();
    },
    []
  );

  // Reloaded each time the sheet opens: an asset added since the last look
  // should be linkable without a refresh.
  useEffect(() => {
    if (!open || !configured) return;
    let cancelled = false;
    chatService
      .getLinkableEntities()
      .then(loaded => {
        if (!cancelled) setEntities(loaded);
      })
      .catch(error => Logger.error('Failed to load linkable records:', error));
    return () => {
      cancelled = true;
    };
  }, [open, configured, chatService]);

  /**
   * Asks the service what is worth remembering from the exchange that just
   * finished, and labels the reply with whatever it wrote. `remember` swallows
   * its own failures, so there is nothing to catch: a memory that could not be
   * written is a log line, not a broken conversation.
   */
  const rememberFromExchange = useCallback(
    async (question: string, reply: string, replyId: number) => {
      const controller = new AbortController();
      rememberRef.current = controller;
      try {
        const changes = await chatService.remember(question, reply, controller.signal);
        if (changes.length === 0 || controller.signal.aborted) return;

        const remembered = changes
          .filter(change => change.op !== 'delete')
          .map(change => change.text);
        const forgotten = changes.filter(change => change.op === 'delete').length;

        // The thread may have been cleared while this was in flight, in which
        // case there is no longer a message to label.
        setMessages(current =>
          current.some(message => message.id === replyId)
            ? current.map(message =>
                message.id === replyId ? { ...message, remembered, forgotten } : message
              )
            : current
        );
      } finally {
        if (rememberRef.current === controller) rememberRef.current = undefined;
      }
    },
    [chatService]
  );

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isThinking) return;

      const controller = new AbortController();
      abortRef.current = controller;

      setDraft('');
      setMessages(current => [...current, { id: nextId.current++, role: 'user', text: trimmed }]);
      setIsThinking(true);
      setActiveTool(undefined);

      try {
        const answer = await chatService.ask(history.current, trimmed, converter, {
          signal: controller.signal,
          onToolCall: setActiveTool,
        });

        history.current = answer.transcript;

        const replyId = nextId.current++;
        setMessages(current => [
          ...current,
          {
            id: replyId,
            role: 'assistant',
            text: answer.reply,
            toolTrace: answer.toolTrace.map(entry => entry.name),
            warnings: answer.warnings,
          },
        ]);

        // Fired after the reply is on screen, never awaited before it. Curating
        // memory costs a request, and making the user wait for it would spend
        // that time on something they did not ask for.
        void rememberFromExchange(trimmed, answer.reply, replyId);
      } catch (error) {
        if (controller.signal.aborted) return;

        Logger.error('Chat request failed:', error);
        notify(
          error instanceof LlmError ? error.message : `The assistant failed: ${String(error)}`,
          'error'
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = undefined;
        setIsThinking(false);
        setActiveTool(undefined);
      }
    },
    [chatService, converter, isThinking, notify, rememberFromExchange]
  );

  /**
   * Drops the thread and the history the model is sent with it, so the next
   * question starts clean. The draft is left alone: a half-typed question is
   * not part of what is being cleared.
   */
  const handleClear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = undefined;
    history.current = [];
    setMessages([]);
    setIsThinking(false);
    setActiveTool(undefined);
  }, []);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = undefined;
    setIsThinking(false);
    setActiveTool(undefined);
  }, []);

  return (
    <ChatSheetView
      open={open}
      providerHost={chatService.getProviderHost()}
      configured={configured}
      canClear={messages.length > 0}
      onClear={handleClear}
      onClose={onClose}
    >
      {!configured ? (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Alert severity="info">
              No AI provider is configured yet. Add one in Settings to use the assistant.
            </Alert>
            <Button
              variant="contained"
              onClick={() => {
                onClose();
                navigate('/settings');
              }}
            >
              Open Settings
            </Button>
          </Stack>
        </Paper>
      ) : (
        <>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
            <ChatThreadView
              messages={messages}
              isThinking={isThinking}
              activeTool={activeTool}
              suggestions={SUGGESTIONS}
              onSuggestionClick={send}
              entities={entities}
              onNavigate={onNavigate}
            />
            <div ref={threadEndRef} />
          </Box>

          <ChatComposerView
            value={draft}
            isThinking={isThinking}
            disabled={false}
            onChange={setDraft}
            onSend={() => send(draft)}
            onStop={handleStop}
          />
        </>
      )}
    </ChatSheetView>
  );
}
