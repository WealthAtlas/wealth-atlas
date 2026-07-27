import { Description, Upload } from '@mui/icons-material';
import { Alert, Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import { ChangeEvent } from 'react';

export interface ImportSourceViewProps {
  configured: boolean;
  providerHost: string;
  fileName?: string;
  pastedText: string;
  canAnalyse: boolean;
  onFileSelected: (file: File) => void;
  onPastedTextChange: (text: string) => void;
  onAnalyse: () => void;
  onOpenSettings: () => void;
}

export function ImportSourceView(props: ImportSourceViewProps) {
  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) props.onFileSelected(file);
    event.target.value = '';
  };

  if (!props.configured) {
    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Alert severity="info">
            No AI provider is configured yet. Add one in Settings to use statement import.
          </Alert>
          <Button variant="contained" onClick={props.onOpenSettings}>
            Open Settings
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Drop in a CSV export from your broker or bank — Zerodha, Coin, INDMoney, or any US/UK
          brokerage. The file is read alongside your current portfolio, and you review every change
          before anything is saved.
        </Typography>

        <Alert severity="warning">
          The contents of this file will be sent to <strong>{props.providerHost}</strong> for
          analysis. Nothing is written to your data until you approve it on the next screen.
        </Alert>

        <Box>
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={handleFileInput}
            style={{ display: 'none' }}
            id="ai-import-file-input"
          />
          <label htmlFor="ai-import-file-input">
            <Button variant="outlined" startIcon={<Upload />} component="span" fullWidth>
              Choose CSV file
            </Button>
          </label>
        </Box>

        {props.fileName && (
          <Chip
            icon={<Description />}
            label={props.fileName}
            onDelete={() => props.onPastedTextChange('')}
            sx={{ alignSelf: 'flex-start' }}
          />
        )}

        <Typography variant="caption" color="text.secondary">
          …or paste the contents directly:
        </Typography>

        <TextField
          multiline
          minRows={6}
          maxRows={16}
          fullWidth
          value={props.pastedText}
          onChange={event => props.onPastedTextChange(event.target.value)}
          placeholder="symbol,trade_date,trade_type,quantity,price&#10;INFY,2024-03-15,buy,10,1450.75"
          InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
        />

        <Button
          variant="contained"
          size="large"
          disabled={!props.canAnalyse}
          onClick={props.onAnalyse}
        >
          Analyse
        </Button>
      </Stack>
    </Paper>
  );
}
