import { ChatSheetView } from '@/app/components/views/ChatSheetView';
import { LinkableEntity, LinkTarget } from '@/domain/chat/EntityLinks';
import { useCurrency } from '@/app/components/providers/CurrencyContext';
import { useNotification } from '@/app/components/providers/NotificationContext';
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
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(1);

  /**
   * Only the plain questions and answers, which is what `ChatService.ask` wants:
   * it attaches a fresh snapshot to the live question, so replaying an old one
   * would have the model reasoning about figures that have since moved.
   */
  const history = useRef<LlmMessage[]>([]);

  const configured = chatService.isConfigured();

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Abandon an in-flight request if the page goes away mid-answer.
  useEffect(() => () => abortRef.current?.abort(), []);

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

        history.current = [
          ...history.current,
          { role: 'user', content: trimmed },
          { role: 'assistant', content: answer.reply },
        ];

        setMessages(current => [
          ...current,
          {
            id: nextId.current++,
            role: 'assistant',
            text: answer.reply,
            toolTrace: answer.toolTrace.map(entry => entry.name),
            warnings: answer.warnings,
          },
        ]);
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
    [chatService, converter, isThinking, notify]
  );

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
