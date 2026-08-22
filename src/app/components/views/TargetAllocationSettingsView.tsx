import { DriftRow } from '@/domain/market/AllocationDrift';
import { PieChart } from '@mui/icons-material';
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

export interface TargetAllocationRow {
  category: string;
  /** As typed. Empty means this category is not part of the policy. */
  targetPercent: string;
  bandPercent: string;
  /** Share of the portfolio actually held, when anything is held. */
  actualPercent?: number;
  /** Present only for categories the saved policy covers. */
  drift?: DriftRow;
}

export interface TargetAllocationSettingsViewProps {
  rows: TargetAllocationRow[];
  /** Sum of the targets as typed, so an over-100 total is visible immediately. */
  totalPercent: number;
  issues: string[];
  isDirty: boolean;
  isSaving: boolean;
  hasSavedPolicy: boolean;
  currency: string;
  onChange: (category: string, field: 'targetPercent' | 'bandPercent', value: string) => void;
  onSave: () => void;
  onRevert: () => void;
}

function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString();
}

export function TargetAllocationSettingsView({
  rows,
  totalPercent,
  issues,
  isDirty,
  isSaving,
  hasSavedPolicy,
  currency,
  onChange,
  onSave,
  onRevert,
}: TargetAllocationSettingsViewProps) {
  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PieChart />
          <Typography variant="h6">Target Allocation</Typography>
          <Chip
            size="small"
            label={`${totalPercent}% allocated`}
            color={totalPercent > 100 ? 'error' : totalPercent === 100 ? 'success' : 'default'}
          />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          The share of your portfolio you intend to hold in each category. Leave a category blank to
          keep it out of the policy; enter 0 to say you deliberately want none of it. The band is
          how far a category may drift before it is worth acting on.
        </Typography>

        {!hasSavedPolicy && (
          <Alert severity="info">
            No target is set yet, so nothing can be called over- or under-weight — including by the
            assistant, which will ask you for a target instead of assuming one.
          </Alert>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell align="right">Target %</TableCell>
              <TableCell align="right">Band %</TableCell>
              <TableCell align="right">Held %</TableCell>
              <TableCell align="right">To reach target</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.category}>
                <TableCell>{row.category}</TableCell>
                <TableCell align="right">
                  <TextField
                    size="small"
                    value={row.targetPercent}
                    onChange={event => onChange(row.category, 'targetPercent', event.target.value)}
                    inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }}
                    sx={{ width: 90 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    size="small"
                    value={row.bandPercent}
                    onChange={event => onChange(row.category, 'bandPercent', event.target.value)}
                    inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }}
                    sx={{ width: 90 }}
                    disabled={row.targetPercent.trim() === ''}
                  />
                </TableCell>
                <TableCell align="right">
                  {row.actualPercent === undefined ? '—' : `${row.actualPercent}%`}
                </TableCell>
                <TableCell align="right">
                  {row.drift === undefined || row.drift.action === 'hold' ? (
                    row.drift === undefined ? (
                      '—'
                    ) : (
                      <Chip size="small" label="On target" color="success" variant="outlined" />
                    )
                  ) : (
                    <Chip
                      size="small"
                      color={row.drift.action === 'buy' ? 'primary' : 'warning'}
                      label={`${row.drift.action === 'buy' ? 'Buy' : 'Sell'} ${formatAmount(
                        Math.abs(row.drift.adjustmentAmount)
                      )} ${currency}`}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {issues.length > 0 && (
          <Alert severity="warning">
            <Stack>
              {issues.map(issue => (
                <Typography key={issue} variant="body2">
                  {issue}
                </Typography>
              ))}
            </Stack>
          </Alert>
        )}

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={!isDirty || isSaving || issues.length > 0}
          >
            Save Allocation
          </Button>
          <Button variant="outlined" onClick={onRevert} disabled={!isDirty || isSaving}>
            Revert
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
