import { Send, Stop } from '@mui/icons-material';
import { IconButton, Paper, Stack, TextField } from '@mui/material';
import { KeyboardEvent } from 'react';

export interface ChatComposerViewProps {
  value: string;
  isThinking: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
}

export function ChatComposerView(props: ChatComposerViewProps) {
  const canSend = props.value.trim().length > 0 && !props.isThinking && !props.disabled;

  // Enter sends; Shift+Enter breaks the line, so a multi-part question is still
  // possible without a separate control.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) props.onSend();
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 1, mt: 1 }}>
      <Stack direction="row" spacing={1} alignItems="flex-end">
        <TextField
          fullWidth
          multiline
          maxRows={5}
          size="small"
          placeholder="Ask about your money…"
          value={props.value}
          disabled={props.disabled}
          onChange={event => props.onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {props.isThinking ? (
          <IconButton color="primary" onClick={props.onStop} aria-label="Stop">
            <Stop />
          </IconButton>
        ) : (
          <IconButton color="primary" onClick={props.onSend} disabled={!canSend} aria-label="Send">
            <Send />
          </IconButton>
        )}
      </Stack>
    </Paper>
  );
}
