import { CloudDownload, CloudUpload, Download, SyncProblem } from '@mui/icons-material';
import {
  Alert,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { SyncConflict } from '@/data/sync/conflict';

export interface SyncConflictViewProps {
  conflict: SyncConflict;
  busy: boolean;
  /** True when no passphrase is stored, so resolving needs one typed in. */
  needsPassphrase: boolean;
  passphrase: string;
  onPassphraseChange: (passphrase: string) => void;
  onKeepLocal: () => void;
  onTakeRemote: () => void;
  onExportBackup: () => void;
  onDismiss: () => void;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString();
}

/**
 * The one screen where a whole-database replacement is presented as a choice
 * rather than performed on an inference.
 *
 * It states which copy each button keeps and what happens to the other, because
 * both buttons are destructive and the wording is the only thing standing
 * between the user and the outcome they did not want. Neither is styled as the
 * safe default: which copy is the right one is not something the app can know.
 */
export function SyncConflictView(props: SyncConflictViewProps) {
  const { conflict } = props;
  const blocked = props.needsPassphrase && !props.passphrase;

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2, borderColor: 'warning.main', borderTop: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6">
          <SyncProblem sx={{ mr: 1, verticalAlign: 'middle' }} /> Sync Conflict
        </Typography>

        <Alert severity="warning">
          <AlertTitle>This device and the cloud have both changed</AlertTitle>
          {conflict.direction === 'push'
            ? 'Another device has saved changes since this one last synced, so uploading ' +
              'from here would delete them.'
            : 'This device has changes the cloud has never seen, so downloading would ' +
              'delete them.'}{' '}
          Sync is paused until you choose which copy to keep. Nothing has been changed or deleted.
        </Alert>

        <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
          <CardContent>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  This device is based on cloud version:
                </Typography>
                <Typography variant="body2">{conflict.baseVersion ?? 'unknown'}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  The cloud is now on version:
                </Typography>
                <Typography variant="body2">{conflict.remoteVersion}</Typography>
              </Stack>
              {conflict.pendingSince && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Unsynced changes on this device since:
                  </Typography>
                  <Typography variant="body2">{when(conflict.pendingSince)}</Typography>
                </Stack>
              )}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Detected:
                </Typography>
                <Typography variant="body2">{when(conflict.detectedAt)}</Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={props.onExportBackup}
          disabled={props.busy}
        >
          Export this device as a backup first
        </Button>

        {props.needsPassphrase && (
          <TextField
            fullWidth
            label="Passphrase"
            type="password"
            value={props.passphrase}
            onChange={event => props.onPassphraseChange(event.target.value)}
            helperText="Needed to read or write the cloud copy"
          />
        )}

        <Divider />

        <Typography variant="subtitle2">Choose which copy to keep</Typography>

        <Typography variant="caption" color="text.secondary">
          This is a one-time step. Whichever copy you keep becomes the shared starting point, and
          from then on changes made on different devices merge automatically — you will only be
          asked again if the two devices somehow fall out of step.
        </Typography>

        <Stack spacing={1}>
          <Button
            variant="contained"
            color="warning"
            startIcon={<CloudUpload />}
            onClick={props.onKeepLocal}
            disabled={props.busy || blocked}
            fullWidth
          >
            Keep this device
          </Button>
          <Typography variant="caption" color="text.secondary">
            Uploads this device over the cloud. The cloud copy is saved here as a recovery file
            before it is replaced.
          </Typography>

          <Button
            variant="outlined"
            color="warning"
            startIcon={<CloudDownload />}
            onClick={props.onTakeRemote}
            disabled={props.busy || blocked}
            fullWidth
          >
            Use the cloud copy
          </Button>
          <Typography variant="caption" color="text.secondary">
            Replaces everything on this device with the cloud copy. This device is saved as a
            recovery file first, listed under Recovery Copies below.
          </Typography>
        </Stack>

        <Button size="small" onClick={props.onDismiss} disabled={props.busy}>
          Decide later
        </Button>
      </Stack>
    </Paper>
  );
}
