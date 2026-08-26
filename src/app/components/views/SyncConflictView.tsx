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
import { conflictKind, type SyncConflict } from '@/data/sync/conflict';

export interface SyncConflictViewProps {
  /** `overwrite` only: applies the merge the user has just approved. */
  onConfirmMerge: () => void;
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
  // A downgrade is not a choice between two copies, so the card does not offer
  // one: both answers are wrong, and the fix is on the other device.
  const kind = conflictKind(conflict);
  const downgrade = kind === 'downgrade';
  // A merge held for approval: not a choice between two copies, but a choice
  // about one operation, so the copy-picking buttons are wrong here too.
  const overwrite = kind === 'overwrite';
  const chooseCopy = !downgrade && !overwrite;

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2, borderColor: 'warning.main', borderTop: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6">
          <SyncProblem sx={{ mr: 1, verticalAlign: 'middle' }} />{' '}
          {downgrade ? 'Sync Paused' : overwrite ? 'Confirm Merge' : 'Sync Conflict'}
        </Typography>

        <Alert severity="warning">
          <AlertTitle>
            {downgrade
              ? 'Another device is running an older version'
              : overwrite
                ? 'Another device has already changed some of these records'
                : 'This device and the cloud have both changed'}
          </AlertTitle>
          {overwrite
            ? `Merging would replace ${conflict.overwriteCount ?? 0} record` +
              `${conflict.overwriteCount === 1 ? '' : 's'} on this device` +
              (conflict.removalCount
                ? ` and remove ${conflict.removalCount} that another device deleted`
                : '') +
              '. Records only one device has are always kept — these are the ones both ' +
              'devices have, where the more recent change wins. Nothing has changed yet.'
            : downgrade
              ? `The cloud copy was last written by an older version of the app (snapshot ` +
                `v${conflict.snapshotVersion} where this device has already read ` +
                `v${conflict.expectedSnapshotVersion}). Reading it here would lose what that ` +
                'version has no place to keep — records of what you deleted, so deleted items ' +
                'would come back, and the marker that lets devices merge instead of overwriting ' +
                'each other. Update Wealth Atlas on your other device and sync will resume by ' +
                'itself. Nothing on this device has been changed or deleted.'
              : (conflict.direction === 'push'
                  ? 'Another device has saved changes since this one last synced, so uploading ' +
                    'from here would delete them.'
                  : 'This device has changes the cloud has never seen, so downloading would ' +
                    'delete them.') +
                ' Sync is paused until you choose which copy to keep. Nothing has been changed ' +
                'or deleted.'}
        </Alert>

        {overwrite && conflict.impacts && conflict.impacts.length > 0 && (
          <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
            <CardContent>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Affected on this device
                </Typography>
                {conflict.impacts.map((impact, index) => (
                  <Typography key={`${impact.table}-${index}`} variant="body2">
                    {impact.removed ? '\u2212' : '\u21bb'} {impact.label}{' '}
                    <Typography component="span" variant="caption" color="text.secondary">
                      ({impact.table})
                    </Typography>
                  </Typography>
                ))}
                {(conflict.overwriteCount ?? 0) + (conflict.removalCount ?? 0) >
                  conflict.impacts.length && (
                  <Typography variant="caption" color="text.secondary">
                    …and{' '}
                    {(conflict.overwriteCount ?? 0) +
                      (conflict.removalCount ?? 0) -
                      conflict.impacts.length}{' '}
                    more
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {overwrite && (
          <>
            <Divider />
            <Typography variant="subtitle2">Before you merge</Typography>
            <Typography variant="caption" color="text.secondary">
              Downloading a backup first costs nothing and makes this reversible. It is the only
              copy of this device that no sync operation can reach.
            </Typography>
            <Stack spacing={1}>
              <Button
                variant="contained"
                color="warning"
                startIcon={<CloudDownload />}
                onClick={props.onConfirmMerge}
                disabled={props.busy || blocked}
                fullWidth
              >
                Merge, keeping the more recent of each
              </Button>
              <Button size="small" onClick={props.onDismiss} disabled={props.busy}>
                Cancel — leave both copies alone
              </Button>
            </Stack>
          </>
        )}

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

        {!downgrade && props.needsPassphrase && (
          <TextField
            fullWidth
            label="Passphrase"
            type="password"
            value={props.passphrase}
            onChange={event => props.onPassphraseChange(event.target.value)}
            helperText="Needed to read or write the cloud copy"
          />
        )}

        {chooseCopy && (
          <>
            <Divider />

            <Typography variant="subtitle2">Choose which copy to keep</Typography>

            <Typography variant="caption" color="text.secondary">
              This is a one-time step. Whichever copy you keep becomes the shared starting point,
              and from then on changes made on different devices merge automatically — you will only
              be asked again if the two devices somehow fall out of step.
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
          </>
        )}
      </Stack>
    </Paper>
  );
}
