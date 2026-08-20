import { Currency } from '@/domain/entities/shared/Currency';
import { CurrencyExchange } from '@mui/icons-material';
import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

export interface CurrencySettingsViewProps {
  baseCurrency: Currency;
  currencies: Currency[];
  /** The whole configuration as JSON text, which is what the user edits. */
  config: string;
  configIssues: string[];
  isDirty: boolean;
  isSaving: boolean;
  onBaseCurrencyChange: (currency: Currency) => void;
  onConfigChange: (config: string) => void;
  onSaveConfig: () => void;
  onRevertConfig: () => void;
}

export function CurrencySettingsView({
  baseCurrency,
  currencies,
  config,
  configIssues,
  isDirty,
  isSaving,
  onBaseCurrencyChange,
  onConfigChange,
  onSaveConfig,
  onRevertConfig,
}: CurrencySettingsViewProps) {
  const [pendingBaseCurrency, setPendingBaseCurrency] = useState<Currency | undefined>();

  const confirmBaseCurrencyChange = () => {
    if (pendingBaseCurrency) onBaseCurrencyChange(pendingBaseCurrency);
    setPendingBaseCurrency(undefined);
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CurrencyExchange color="primary" />
          <Typography variant="h6">Currency</Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          Every total that spans more than one holding — your dashboard, goals and monthly expenses
          — is reported in the base currency. Individual assets, loans and expenses keep the
          currency you entered them in.
        </Typography>

        <FormControl fullWidth>
          <InputLabel>Base currency</InputLabel>
          <Select
            value={baseCurrency}
            label="Base currency"
            onChange={event => setPendingBaseCurrency(event.target.value as Currency)}
          >
            {currencies.map(currency => (
              <MenuItem key={currency} value={currency}>
                {currency}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider />

        <Typography variant="subtitle2">Currencies and rates</Typography>
        <Typography variant="body2" color="text.secondary">
          Add a currency by putting its ISO code in <code>currencies</code>, and give it a rate: how
          many {baseCurrency} one unit is worth. A rate can also be{' '}
          <code>{'{ "rate": 88.42, "script": "…" }'}</code>, where the script exports{' '}
          <code>getValue()</code> and is re-run daily.
        </Typography>

        <TextField
          value={config}
          onChange={event => onConfigChange(event.target.value)}
          error={configIssues.length > 0}
          multiline
          minRows={8}
          fullWidth
          spellCheck={false}
          inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
        />

        {configIssues.length > 0 && (
          <Alert severity="error">
            <AlertTitle>Nothing saved yet</AlertTitle>
            <Stack component="ul" sx={{ pl: 2, m: 0 }} spacing={0.5}>
              {configIssues.map(issue => (
                <li key={issue}>
                  <Typography variant="body2">{issue}</Typography>
                </li>
              ))}
            </Stack>
          </Alert>
        )}

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            onClick={onSaveConfig}
            disabled={!isDirty || isSaving || configIssues.length > 0}
          >
            Save
          </Button>
          <Button onClick={onRevertConfig} disabled={!isDirty || isSaving}>
            Revert
          </Button>
        </Stack>

        <Alert severity="info" variant="outlined">
          A currency with no rate contributes zero to every total, and the pages that aggregate say
          so — it is never guessed at 1:1.
        </Alert>
      </Stack>

      <Dialog open={Boolean(pendingBaseCurrency)} onClose={() => setPendingBaseCurrency(undefined)}>
        <DialogTitle>Change base currency to {pendingBaseCurrency}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Stored rates are quoted against {baseCurrency}, so they stop meaning anything once{' '}
            {pendingBaseCurrency} is the base. They will be cleared, along with any rate scripts,
            and you will need to enter them again. Nothing else about your data changes.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingBaseCurrency(undefined)}>Cancel</Button>
          <Button onClick={confirmBaseCurrencyChange} color="warning" variant="contained">
            Change and clear rates
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
