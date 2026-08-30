import { Refresh, WarningAmber } from '@mui/icons-material';
import { Alert, AlertTitle, Box, Button, Paper, Stack, Typography } from '@mui/material';
import type { DatabaseOpenFailure } from '@/data/database';

export type AppFailureKind = DatabaseOpenFailure | 'crashed';

export interface AppFailureViewProps {
  kind: AppFailureKind;
  /** Reloads without the precached build. Never touches stored records. */
  onReload: () => void;
  busy: boolean;
}

/**
 * What the user sees instead of a blank page.
 *
 * The blank page is the failure this replaces, and it was the expensive one: it
 * says nothing, so the only remedy a person can find unaided is to clear the
 * site's storage — which is where every asset, transaction and expense lives.
 * A failure to *read* the database then becomes a permanent loss, by the user's
 * own hand, with the app never having said a word.
 *
 * So the one instruction that has to survive every wording change is the one
 * telling them not to do that.
 */
export function AppFailureView(props: AppFailureViewProps) {
  const stale = props.kind === 'stale-build';

  return (
    <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
      <Paper elevation={2} sx={{ p: 3, maxWidth: 560, width: '100%' }}>
        <Stack spacing={2}>
          <Typography variant="h6">
            <WarningAmber sx={{ mr: 1, verticalAlign: 'middle' }} /> Wealth Atlas could not start
          </Typography>

          <Alert severity="warning">
            <AlertTitle>
              {stale
                ? 'This device is running an older version of the app'
                : 'Something went wrong opening your data'}
            </AlertTitle>
            {stale
              ? 'Your records on this device were saved by a newer version than the one ' +
                'currently loaded here, and an older version cannot read them. This is what ' +
                'happens when one device has updated and another has not yet.'
              : 'The app loaded but could not open its database. This is usually a stale copy ' +
                'of the app being served from this device cache.'}
          </Alert>

          <Alert severity="error" icon={false}>
            <AlertTitle>Do not clear this site data</AlertTitle>
            Your records are stored on this device, not on the screen. Clearing the site storage,
            cache or history deletes them, and unless you have exported a backup there is no other
            copy. Nothing has been lost yet.
          </Alert>

          <Typography variant="body2" color="text.secondary">
            Reloading fetches the current version of the app and leaves everything stored on this
            device untouched. If it keeps failing, open Wealth Atlas on a device that does work and
            export a backup from Settings before doing anything else here.
          </Typography>

          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={props.onReload}
            disabled={props.busy}
            fullWidth
          >
            Reload with the current version
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
