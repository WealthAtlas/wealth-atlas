import { CloudDownload, Search } from '@mui/icons-material';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { RemoteInspection } from '@/data/sync/Syncer';

export interface CloudCopyViewProps {
  inspection?: RemoteInspection;
  busy: boolean;
  /** True when no passphrase is stored, so reading needs one typed in. */
  needsPassphrase: boolean;
  passphrase: string;
  onPassphraseChange: (passphrase: string) => void;
  onInspect: () => void;
  onDownload: () => void;
}

/** Tables worth naming; the rest are counted but not itemised. */
const HEADLINE = ['assets', 'investments', 'loans', 'expenses', 'goals', 'sips'] as const;

/**
 * The only place the cloud copy can be looked at rather than taken.
 *
 * Push replaces the cloud and Pull replaces the device, so until this existed
 * the question "are my records still up there?" could only be answered by doing
 * the thing the user was afraid of. Both actions here are read-only, and the
 * caption says so where it will be read.
 */
export function CloudCopyView(props: CloudCopyViewProps) {
  const { inspection } = props;
  const blocked = props.needsPassphrase && !props.passphrase;

  return (
    <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">The cloud copy</Typography>
          <Typography variant="caption" color="text.secondary">
            Reads what the cloud is holding without changing anything, here or there. Use it before
            Push or Pull, both of which replace one side with the other.
          </Typography>

          {props.needsPassphrase && (
            <TextField
              fullWidth
              size="small"
              label="Passphrase"
              type="password"
              value={props.passphrase}
              onChange={event => props.onPassphraseChange(event.target.value)}
              helperText="Needed to decrypt the cloud copy"
            />
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Search />}
              onClick={props.onInspect}
              disabled={props.busy || blocked}
              fullWidth
            >
              See what it holds
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CloudDownload />}
              onClick={props.onDownload}
              disabled={props.busy || blocked}
              fullWidth
            >
              Download it as a backup file
            </Button>
          </Stack>

          {inspection && (
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {HEADLINE.map(table => (
                  <Chip
                    key={table}
                    size="small"
                    label={`${table}: ${inspection.counts[table] ?? 0}`}
                    color={inspection.counts[table] ? 'default' : 'warning'}
                  />
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Cloud version {inspection.version}
                {inspection.updatedAt
                  ? `, saved ${new Date(inspection.updatedAt).toLocaleString()}`
                  : ''}
                {'. '}
                {inspection.sameLineage
                  ? 'This device can merge with it.'
                  : 'This device would have to replace rather than merge — the two are not sharing a starting point.'}
              </Typography>
              {!inspection.counts.assets && !inspection.counts.expenses && (
                <Alert severity="warning">
                  The cloud copy has no assets and no expenses in it. Do not Pull: it would replace
                  this device with an empty one. Download it, then look for a fuller copy under
                  Recovery Copies or in a backup file.
                </Alert>
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
