import { Currency } from '@/domain/entities/shared/Currency';
import { CurrencyExchange } from '@mui/icons-material';
import {
  Alert,
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

export interface CurrencyRateRow {
  code: Currency;
  /** Draft text for "units of base per one unit of `code`". */
  rate: string;
  script: string;
  updatedAt?: Date;
  isDirty: boolean;
  error?: string;
}

export interface CurrencySettingsViewProps {
  baseCurrency: Currency;
  currencies: Currency[];
  rates: CurrencyRateRow[];
  isSaving: boolean;
  onBaseCurrencyChange: (currency: Currency) => void;
  onRateChange: (code: Currency, rate: string) => void;
  onScriptChange: (code: Currency, script: string) => void;
  onSaveRate: (code: Currency) => void;
}

export function CurrencySettingsView({
  baseCurrency,
  currencies,
  rates,
  isSaving,
  onBaseCurrencyChange,
  onRateChange,
  onScriptChange,
  onSaveRate,
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

        <Typography variant="subtitle2">Exchange rates</Typography>

        {rates.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nothing to configure — {baseCurrency} is the only supported currency.
          </Typography>
        ) : (
          rates.map(row => (
            <Stack key={row.code} spacing={1}>
              <Typography variant="body2" color="text.secondary">
                1 {row.code} equals how many {baseCurrency}?
              </Typography>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <TextField
                  label={`${row.code} → ${baseCurrency}`}
                  value={row.rate}
                  onChange={event => onRateChange(row.code, event.target.value)}
                  error={Boolean(row.error)}
                  helperText={
                    row.error ??
                    (row.updatedAt
                      ? `Last updated ${row.updatedAt.toLocaleDateString()}`
                      : 'No rate set')
                  }
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={!row.isDirty || isSaving}
                  onClick={() => onSaveRate(row.code)}
                  sx={{ mt: 0.5 }}
                >
                  Save
                </Button>
              </Stack>
              <TextField
                label="Rate script (optional)"
                value={row.script}
                onChange={event => onScriptChange(row.code, event.target.value)}
                placeholder={`export async function getValue() { /* return ${row.code} → ${baseCurrency} */ }`}
                multiline
                minRows={2}
                size="small"
                fullWidth
              />
            </Stack>
          ))
        )}

        <Alert severity="info" variant="outlined">
          A currency with no rate contributes zero to every total, and the dashboard says so — it is
          never guessed at 1:1.
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
