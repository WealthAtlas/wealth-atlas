import { ImportOperationKind, ImportPlan, OperationFlag } from '@/domain/import/ImportOperation';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

export interface ImportPlanReviewViewProps {
  plan: ImportPlan;
  selected: boolean[];
  isApplying: boolean;
  onToggle: (index: number) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectVerified: () => void;
  onApply: () => void;
  onBack: () => void;
}

const GROUP_LABELS: Record<ImportOperationKind, string> = {
  createAsset: 'New assets',
  updateAsset: 'Asset updates',
  deleteAsset: 'Asset deletions',
  addTransaction: 'Transactions',
  deleteTransaction: 'Transaction deletions',
  addExpense: 'Expenses',
  updateExpense: 'Expense updates',
  deleteExpense: 'Expense deletions',
  createLoan: 'New loans',
  addLoanPayment: 'Loan payments',
  deleteLoanPayment: 'Loan payment deletions',
};

const FLAG_LABELS: Record<OperationFlag, { label: string; color: 'warning' | 'error' | 'info' }> = {
  unverified: { label: 'not in file', color: 'warning' },
  duplicate: { label: 'already exists', color: 'info' },
  destructive: { label: 'deletes data', color: 'error' },
  invalid: { label: 'invalid', color: 'error' },
};

export function ImportPlanReviewView(props: ImportPlanReviewViewProps) {
  const { plan, selected } = props;
  const selectedCount = selected.filter(Boolean).length;

  const groups = new Map<ImportOperationKind, number[]>();
  plan.operations.forEach((operation, index) => {
    const kind = operation.operation.op;
    const existing = groups.get(kind) ?? [];
    existing.push(index);
    groups.set(kind, existing);
  });

  const unverifiedCount = plan.operations.filter(op => op.flags.includes('unverified')).length;

  if (plan.operations.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Alert severity="info">Nothing to import from this file. {plan.sourceSummary}</Alert>
          {plan.warnings.map((warning, index) => (
            <Alert severity="warning" key={index}>
              {warning}
            </Alert>
          ))}
          <Button onClick={props.onBack}>Try another file</Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Paper elevation={2} sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          {plan.sourceSummary && (
            <Typography variant="body2" color="text.secondary">
              {plan.sourceSummary}
            </Typography>
          )}

          {unverifiedCount > 0 && (
            <Alert severity="warning">
              {unverifiedCount} operation{unverifiedCount === 1 ? '' : 's'} contain a number that
              could not be found in the source file. These are unticked by default — check them
              against the statement before including them.
            </Alert>
          )}

          {plan.warnings.map((warning, index) => (
            <Alert severity="info" key={index}>
              {warning}
            </Alert>
          ))}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" onClick={props.onSelectAll}>
              Select all
            </Button>
            <Button size="small" onClick={props.onSelectNone}>
              Select none
            </Button>
            <Button size="small" onClick={props.onSelectVerified}>
              Only verified
            </Button>
          </Box>
        </Stack>
      </Paper>

      {Array.from(groups.entries()).map(([kind, indices]) => (
        <Paper elevation={2} key={kind}>
          <Typography variant="subtitle2" sx={{ px: 2, pt: 2 }}>
            {GROUP_LABELS[kind]} ({indices.length})
          </Typography>
          <List dense>
            {indices.map(index => {
              const item = plan.operations[index];
              return (
                <ListItem
                  key={index}
                  onClick={() => props.onToggle(index)}
                  sx={{ cursor: 'pointer', alignItems: 'flex-start' }}
                >
                  <Checkbox
                    edge="start"
                    checked={selected[index]}
                    tabIndex={-1}
                    disableRipple
                    sx={{ mt: 0.5 }}
                  />
                  <ListItemText
                    primary={item.summary}
                    secondary={
                      <>
                        {item.flags.length > 0 && (
                          <Box
                            component="span"
                            sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}
                          >
                            {item.flags.map(flag => (
                              <Chip
                                key={flag}
                                size="small"
                                label={FLAG_LABELS[flag].label}
                                color={FLAG_LABELS[flag].color}
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        )}
                        {item.warnings.length > 0 && (
                          <Typography variant="caption" color="text.secondary" component="span">
                            {item.warnings.join(' ')}
                          </Typography>
                        )}
                      </>
                    }
                    secondaryTypographyProps={{ component: 'span' }}
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>
      ))}

      <Divider />

      <Box sx={{ display: 'flex', gap: 1, pb: 2 }}>
        <Button onClick={props.onBack} disabled={props.isApplying} color="inherit">
          Back
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={props.onApply}
          disabled={props.isApplying || selectedCount === 0}
        >
          {props.isApplying
            ? 'Applying…'
            : `Apply ${selectedCount} change${selectedCount === 1 ? '' : 's'}`}
        </Button>
      </Box>
    </Stack>
  );
}
