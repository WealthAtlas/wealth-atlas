import { ExpandLess, ExpandMore, Psychology } from '@mui/icons-material';
import {
  Alert,
  Box,
  CircularProgress,
  Collapse,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { LinkableEntity, LinkTarget } from '@/domain/chat/EntityLinks';
import { hasTable, parseMarkdownBlocks } from '@/domain/chat/MarkdownBlocks';
import { useMemo, useState } from 'react';
import { ChatMarkdownView } from './ChatMarkdownView';

/**
 * One exchange in the thread. Assistant messages carry the tools that were
 * consulted, so a figure can be traced back to what was actually read.
 */
export interface ChatMessageView {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  toolTrace?: string[];
  warnings?: string[];
  /** Memories written from this exchange, shown so a write is never silent. */
  remembered?: string[];
  /** How many memories this exchange superseded or dropped. */
  forgotten?: number;
}

export interface ChatThreadViewProps {
  messages: ChatMessageView[];
  isThinking: boolean;
  /** Tool currently running, shown so a slow turn does not look stalled. */
  activeTool?: string;
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  /** The user's own records, whose names become tappable in a reply. */
  entities: LinkableEntity[];
  onNavigate: (target: LinkTarget) => void;
}

/** `getExpenseBreakdown` → `expense breakdown`. */
function humanise(toolName: string): string {
  return toolName
    .replace(/^get/, '')
    .replace(/^list/, 'list of ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
}

/**
 * Shown whenever the background curator wrote something. The whole reason the
 * curator is allowed to write without asking is that the write is visible here:
 * silent notes about the user would be the wrong trade, and asking permission
 * every time would be nagging.
 */
function MemoryNote({ remembered, forgotten }: { remembered?: string[]; forgotten?: number }) {
  const written = remembered ?? [];
  const dropped = forgotten ?? 0;
  if (written.length === 0 && dropped === 0) return null;

  return (
    <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} alignItems="flex-start">
      <Psychology sx={{ fontSize: '1rem', color: 'text.secondary', mt: '2px' }} />
      <Stack sx={{ minWidth: 0 }}>
        {written.map(text => (
          <Typography key={text} variant="caption" color="text.secondary">
            Remembered: {text}
          </Typography>
        ))}
        {dropped > 0 && (
          <Typography variant="caption" color="text.secondary">
            {dropped === 1 ? 'Forgot 1 earlier note' : `Forgot ${dropped} earlier notes`}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

function ToolTrace({ tools }: { tools: string[] }) {
  const [open, setOpen] = useState(false);
  const unique = Array.from(new Set(tools));

  return (
    <Box sx={{ mt: 1 }}>
      <Link
        component="button"
        variant="caption"
        underline="none"
        color="text.secondary"
        onClick={() => setOpen(!open)}
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
      >
        Consulted {unique.length === 1 ? '1 source' : `${unique.length} sources`}
        {open ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
      </Link>
      <Collapse in={open}>
        <Stack sx={{ mt: 0.5 }}>
          {unique.map(tool => (
            <Typography key={tool} variant="caption" color="text.secondary">
              • your {humanise(tool)}
            </Typography>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

function Message({
  message,
  entities,
  onNavigate,
}: {
  message: ChatMessageView;
  entities: LinkableEntity[];
  onNavigate: (target: LinkTarget) => void;
}) {
  const isUser = message.role === 'user';

  // A table needs the full width of the thread to stay readable; prose reads
  // better in a narrower bubble.
  const wide = useMemo(
    () => !isUser && hasTable(parseMarkdownBlocks(message.text)),
    [isUser, message.text]
  );

  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <Paper
        elevation={isUser ? 0 : 1}
        sx={{
          p: 1.5,
          maxWidth: wide ? '100%' : '85%',
          minWidth: 0,
          bgcolor: isUser ? 'primary.main' : 'background.paper',
          color: isUser ? 'primary.contrastText' : 'text.primary',
        }}
      >
        {isUser ? (
          // The user's own text is shown verbatim — never parsed as markup.
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.text}
          </Typography>
        ) : (
          <ChatMarkdownView text={message.text} entities={entities} onNavigate={onNavigate} />
        )}

        {message.toolTrace && message.toolTrace.length > 0 && (
          <ToolTrace tools={message.toolTrace} />
        )}

        <MemoryNote remembered={message.remembered} forgotten={message.forgotten} />

        {message.warnings?.map(warning => (
          <Alert key={warning} severity="warning" sx={{ mt: 1 }}>
            {warning}
          </Alert>
        ))}
      </Paper>
    </Box>
  );
}

export function ChatThreadView(props: ChatThreadViewProps) {
  if (props.messages.length === 0 && !props.isThinking) {
    return (
      <Stack spacing={2} sx={{ py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Ask about your portfolio, your spending, or what to do next month. Answers come from your
          own records — nothing is made up, and nothing is changed.
        </Typography>
        <Stack spacing={1}>
          {props.suggestions.map(suggestion => (
            <Paper
              key={suggestion}
              elevation={0}
              variant="outlined"
              sx={{ p: 1.5, cursor: 'pointer' }}
              onClick={() => props.onSuggestionClick(suggestion)}
            >
              <Typography variant="body2">{suggestion}</Typography>
            </Paper>
          ))}
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      {props.messages.map(message => (
        <Message
          key={message.id}
          message={message}
          entities={props.entities}
          onNavigate={props.onNavigate}
        />
      ))}

      {props.isThinking && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">
            {props.activeTool ? `Reading your ${humanise(props.activeTool)}…` : 'Thinking…'}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
