import { CheckCircle } from '@mui/icons-material';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';

export interface ImportResultViewProps {
  applied: number;
  onImportAnother: () => void;
  onDone: () => void;
}

export function ImportResultView(props: ImportResultViewProps) {
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Stack spacing={2} alignItems="center">
        <CheckCircle color="success" sx={{ fontSize: 48 }} />
        <Typography variant="h6">Import complete</Typography>
        <Typography variant="body2" color="text.secondary">
          {props.applied} change{props.applied === 1 ? '' : 's'} applied.
        </Typography>

        <Alert severity="info" sx={{ width: '100%' }}>
          Worth a quick look at the Assets and Expenses pages to confirm the numbers match your
          statement.
        </Alert>

        <Stack direction="row" spacing={1}>
          <Button onClick={props.onImportAnother}>Import another file</Button>
          <Button variant="contained" onClick={props.onDone}>
            Done
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
