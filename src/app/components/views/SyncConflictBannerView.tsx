import { Alert, AlertTitle, Box, Button } from '@mui/material';
import type { SyncDirection } from '@/data/sync/conflict';

export interface SyncConflictBannerViewProps {
  direction: SyncDirection;
  onReview: () => void;
}

/**
 * Sits above every page while a conflict stands.
 *
 * Without it the failure is invisible: the refused push is swallowed by the
 * background sync so the user is not interrupted, which would mean sync had
 * silently stopped working — the same class of quiet failure as the deletion
 * this all exists to prevent, just in the other direction.
 */
export function SyncConflictBannerView(props: SyncConflictBannerViewProps) {
  return (
    <Box sx={{ px: 2, pt: 2 }}>
      <Alert
        severity="warning"
        action={
          <Button color="inherit" size="small" onClick={props.onReview}>
            Review
          </Button>
        }
      >
        <AlertTitle sx={{ mb: 0 }}>Sync paused — conflict</AlertTitle>
        {props.direction === 'push'
          ? 'Another device has changes this one has not seen.'
          : 'This device has changes the cloud has not seen.'}{' '}
        Nothing has been deleted.
      </Alert>
    </Box>
  );
}
