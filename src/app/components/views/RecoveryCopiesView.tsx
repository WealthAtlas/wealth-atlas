import { Download, Restore } from '@mui/icons-material';
import { Button, List, ListItem, ListItemText, Paper, Stack, Typography } from '@mui/material';
import type { RecoverySnapshotMeta } from '@/data/sync/recovery';

export interface RecoveryCopiesViewProps {
  copies: RecoverySnapshotMeta[];
  onDownload: (id: number) => void;
}

const REASONS: Record<RecoverySnapshotMeta['reason'], string> = {
  pull: 'This device, kept before a sync pull replaced it',
  link: 'This device, kept before it was linked to an existing sync key',
  'take-remote': 'This device, kept before you chose the cloud copy',
  'keep-local': 'The cloud copy, kept before this device overwrote it',
};

function sizeLabel(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Shown whenever copies exist, conflict or not — someone looking for one is by
 * definition looking after the fact.
 *
 * Every copy is a backup file, so the way back is the Import Data flow the user
 * already has rather than a restore path of its own that has never been run.
 */
export function RecoveryCopiesView(props: RecoveryCopiesViewProps) {
  if (props.copies.length === 0) return null;

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">
          <Restore sx={{ mr: 1, verticalAlign: 'middle' }} /> Recovery Copies
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Sync never replaces your data without keeping the copy it replaced. Each one below is a
          backup file — download it and restore it with Import Data. Only the most recent few are
          kept, and they stay on this device only.
        </Typography>

        <List dense disablePadding>
          {props.copies.map(copy => (
            <ListItem
              key={copy.id}
              disableGutters
              secondaryAction={
                <Button
                  size="small"
                  startIcon={<Download />}
                  onClick={() => props.onDownload(copy.id)}
                >
                  Download
                </Button>
              }
            >
              <ListItemText
                primary={`${new Date(copy.takenAt).toLocaleString()} · ${sizeLabel(copy.sizeBytes)}`}
                secondary={REASONS[copy.reason]}
              />
            </ListItem>
          ))}
        </List>
      </Stack>
    </Paper>
  );
}
