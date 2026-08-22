import { Newspaper } from '@mui/icons-material';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';

export interface NewsProviderSettingsViewProps {
  apiKey: string;
  isDirty: boolean;
  isSaving: boolean;
  isTesting: boolean;
  testResult?: { ok: boolean; message: string };
  onApiKeyChange: (apiKey: string) => void;
  onSave: () => void;
  onTest: () => void;
}

export function NewsProviderSettingsView({
  apiKey,
  isDirty,
  isSaving,
  isTesting,
  testResult,
  onApiKeyChange,
  onSave,
  onTest,
}: NewsProviderSettingsViewProps) {
  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Newspaper />
          <Typography variant="h6">Market News</Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          An AlphaVantage API key lets the assistant read measured news sentiment for the categories
          you hold, instead of describing the market from memory. The free tier allows 25 requests a
          day, so results are cached for six hours.
        </Typography>

        <TextField
          fullWidth
          label="AlphaVantage API key"
          type="password"
          value={apiKey}
          onChange={event => onApiKeyChange(event.target.value)}
          helperText="Leave blank to turn market news off. Free keys are available from alphavantage.co."
        />

        {testResult && (
          <Alert severity={testResult.ok ? 'success' : 'error'}>{testResult.message}</Alert>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="contained" onClick={onSave} disabled={!isDirty || isSaving}>
            Save Key
          </Button>
          <Button
            variant="outlined"
            onClick={onTest}
            disabled={apiKey.trim() === '' || isTesting || isSaving}
          >
            {isTesting ? 'Testing…' : 'Test Key (uses 1 of 25 daily requests)'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
