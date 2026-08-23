import { Add, Delete, Edit, Psychology } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Memory,
  MemoryKind,
  MEMORY_KINDS,
  MEMORY_LIMIT,
  MEMORY_TEXT_LIMIT,
} from '@/domain/entities/memory/Memory';

/** What the user is editing, if anything. `id` is undefined for a new memory. */
export interface MemoryDraft {
  id: number | undefined;
  kind: MemoryKind;
  text: string;
}

export interface MemorySettingsViewProps {
  enabled: boolean;
  memories: Memory[];
  draft?: MemoryDraft;
  isSaving: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onAdd: () => void;
  onEdit: (memory: Memory) => void;
  onDraftChange: (draft: MemoryDraft) => void;
  onDraftSave: () => void;
  onDraftCancel: () => void;
  onDelete: (memory: Memory) => void;
}

const KIND_LABELS: Record<MemoryKind, string> = {
  [MemoryKind.Preference]: 'Preference',
  [MemoryKind.Constraint]: 'Constraint',
  [MemoryKind.Context]: 'Context',
  [MemoryKind.Correction]: 'Correction',
};

export function MemorySettingsView({
  enabled,
  memories,
  draft,
  isSaving,
  onEnabledChange,
  onAdd,
  onEdit,
  onDraftChange,
  onDraftSave,
  onDraftCancel,
  onDelete,
}: MemorySettingsViewProps) {
  const isFull = memories.length >= MEMORY_LIMIT;
  const tooLong = (draft?.text.trim().length ?? 0) > MEMORY_TEXT_LIMIT;
  const isEmpty = (draft?.text.trim() ?? '') === '';

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Psychology color="primary" />
          <Typography variant="h6">Assistant Memory</Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          What the assistant remembers about you between conversations — what you prefer, what you
          will not do, and things it cannot work out from your records, like how much you can invest
          each month. It writes these itself as you talk to it, and tells you when it does. It never
          stores figures it can calculate, so nothing here goes stale.
        </Typography>

        <FormControlLabel
          control={
            <Switch checked={enabled} onChange={event => onEnabledChange(event.target.checked)} />
          }
          label={enabled ? 'Remembering what you tell it' : 'Not remembering anything new'}
        />

        {memories.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Nothing remembered yet. Tell the assistant something about how you invest and it will
            keep it.
          </Typography>
        )}

        <Stack spacing={1}>
          {memories.map(memory =>
            draft !== undefined && draft.id === memory.id ? (
              <MemoryEditor
                key={memory.id}
                draft={draft}
                isSaving={isSaving}
                isEmpty={isEmpty}
                tooLong={tooLong}
                onDraftChange={onDraftChange}
                onSave={onDraftSave}
                onCancel={onDraftCancel}
              />
            ) : (
              <Box
                key={memory.id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                }}
              >
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2">{memory.text}</Typography>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                    <Chip size="small" label={KIND_LABELS[memory.kind]} />
                    <Typography variant="caption" color="text.secondary">
                      {memory.source === 'user' ? 'Added by you' : 'Remembered from a conversation'}
                    </Typography>
                  </Stack>
                </Box>
                <IconButton
                  size="small"
                  aria-label="Edit memory"
                  onClick={() => onEdit(memory)}
                  disabled={isSaving}
                >
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Delete memory"
                  onClick={() => onDelete(memory)}
                  disabled={isSaving}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            )
          )}
        </Stack>

        {draft && draft.id === undefined && (
          <MemoryEditor
            draft={draft}
            isSaving={isSaving}
            isEmpty={isEmpty}
            tooLong={tooLong}
            onDraftChange={onDraftChange}
            onSave={onDraftSave}
            onCancel={onDraftCancel}
          />
        )}

        <Box>
          <Button
            startIcon={<Add />}
            variant="outlined"
            onClick={onAdd}
            disabled={draft !== undefined || isFull || isSaving}
          >
            Add a memory
          </Button>
          {isFull && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Holding the maximum of {MEMORY_LIMIT}. Delete one to add another.
            </Typography>
          )}
        </Box>

        <Typography variant="caption" color="text.secondary">
          These travel with your sync and are included in exported backup files, which are plain
          text on your device.
        </Typography>
      </Stack>
    </Paper>
  );
}

interface MemoryEditorProps {
  draft: MemoryDraft;
  isSaving: boolean;
  isEmpty: boolean;
  tooLong: boolean;
  onDraftChange: (draft: MemoryDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}

function MemoryEditor({
  draft,
  isSaving,
  isEmpty,
  tooLong,
  onDraftChange,
  onSave,
  onCancel,
}: MemoryEditorProps) {
  return (
    <Box sx={{ p: 1, borderRadius: 1, border: 1, borderColor: 'divider' }}>
      <Stack spacing={1}>
        <TextField
          fullWidth
          multiline
          autoFocus
          size="small"
          label="What should it remember?"
          value={draft.text}
          error={tooLong}
          helperText={
            tooLong
              ? `Keep it to one statement of ${MEMORY_TEXT_LIMIT} characters or fewer`
              : `${draft.text.trim().length}/${MEMORY_TEXT_LIMIT}`
          }
          onChange={event => onDraftChange({ ...draft, text: event.target.value })}
        />
        <TextField
          select
          size="small"
          label="Kind"
          value={draft.kind}
          onChange={event => onDraftChange({ ...draft, kind: event.target.value as MemoryKind })}
        >
          {MEMORY_KINDS.map(kind => (
            <MenuItem key={kind} value={kind}>
              {KIND_LABELS[kind]}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            onClick={onSave}
            disabled={isSaving || isEmpty || tooLong}
          >
            Save
          </Button>
          <Button size="small" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
