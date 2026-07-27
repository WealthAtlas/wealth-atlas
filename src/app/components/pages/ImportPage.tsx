import { ArrowBack } from '@mui/icons-material';
import {
  AppBar,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Toolbar,
  Typography,
} from '@mui/material';
import { ReactNode } from 'react';

export type ImportStep = 'source' | 'analysing' | 'review' | 'done';

const STEP_ORDER: ImportStep[] = ['source', 'analysing', 'review', 'done'];
const STEP_LABELS: Record<ImportStep, string> = {
  source: 'File',
  analysing: 'Analyse',
  review: 'Review',
  done: 'Done',
};

export interface ImportPageProps {
  step: ImportStep;
  providerHost: string;
  onBack: () => void;
  onCancelAnalysis: () => void;
  children: ReactNode;
}

export function ImportPage(props: ImportPageProps) {
  const activeStep = STEP_ORDER.indexOf(props.step);

  return (
    <Box sx={{ pb: 4 }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={props.onBack} aria-label="Back">
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1 }}>
            Import Statement
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />

      <Box sx={{ p: 2 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {STEP_ORDER.map(step => (
            <Step key={step}>
              <StepLabel>{STEP_LABELS[step]}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {props.step === 'analysing' ? (
          <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Reading your file with {props.providerHost}…
            </Typography>
            <Typography
              variant="caption"
              color="primary"
              sx={{ cursor: 'pointer' }}
              onClick={props.onCancelAnalysis}
            >
              Cancel
            </Typography>
          </Stack>
        ) : (
          props.children
        )}
      </Box>
    </Box>
  );
}
