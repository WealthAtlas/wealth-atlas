import { DecisionEntry } from '@/domain/entities/journal/DecisionEntry';
import { DecisionReview, JournalSummary } from '@/domain/journal/DecisionReview';
import { ArrowBack, HistoryEdu } from '@mui/icons-material';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';

export interface DecisionDraft {
  category: string;
  action: string;
  status: string;
  amount: string;
  rationale: string;
}

export interface DecisionJournalPageProps {
  entries: { entry: DecisionEntry; review: DecisionReview }[];
  summary: JournalSummary;
  categories: string[];
  draft: DecisionDraft;
  draftIssues: string[];
  isSaving: boolean;
  isLoading: boolean;
  currency: string;
  /** Evidence that will be frozen into the entry, described for the user. */
  evidencePreview: string[];
  onDraftChange: (field: keyof DecisionDraft, value: string) => void;
  onRecord: () => void;
  onDelete: (id: number) => void;
  onBack: () => void;
}

const VERDICT_LABELS: Record<string, { label: string; colour: 'success' | 'error' | 'default' }> = {
  'direction-right': { label: 'Reasoning held up', colour: 'success' },
  'direction-wrong': { label: 'Reasoning did not hold', colour: 'error' },
  'too-soon': { label: 'Too soon to judge', colour: 'default' },
  'not-directional': { label: 'No directional claim', colour: 'default' },
  inconclusive: { label: 'Benchmark barely moved', colour: 'default' },
  'no-evidence': { label: 'No benchmark recorded', colour: 'default' },
};

function formatAmount(amount: number | undefined, currency: string): string {
  return amount === undefined ? '—' : `${Math.round(amount).toLocaleString()} ${currency}`;
}

export function DecisionJournalPage({
  entries,
  summary,
  categories,
  draft,
  draftIssues,
  isSaving,
  isLoading,
  currency,
  evidencePreview,
  onDraftChange,
  onRecord,
  onDelete,
  onBack,
}: DecisionJournalPageProps) {
  return (
    <Box>
      <AppBar position="fixed" color="primary" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onBack} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Decision Journal
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3, pt: 10 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Record what you decided and why, with the figures you were looking at. Months later this
          shows whether the reasoning held up — which is the only way to tell useful advice from
          confident-sounding noise.
        </Typography>

        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <HistoryEdu />
              <Typography variant="h6">Track Record</Typography>
            </Stack>

            {summary.scoredCount === 0 ? (
              <Alert severity="info">
                {summary.entryCount === 0
                  ? 'Nothing recorded yet.'
                  : `${summary.entryCount} recorded, none old enough to judge yet. A decision is scored once it is at least 90 days old and made a directional call.`}
              </Alert>
            ) : (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  color="primary"
                  label={`${summary.hitRatePercent}% of ${summary.scoredCount} scored decisions pointed the right way`}
                />
                <Chip variant="outlined" label={`${summary.rightCount} right`} />
                <Chip variant="outlined" label={`${summary.wrongCount} wrong`} />
                <Chip variant="outlined" label={`${summary.entryCount} recorded in total`} />
              </Stack>
            )}

            <Typography variant="caption" color="text.secondary">
              A verdict compares the category benchmark then with the benchmark now, so it scores
              the reasoning rather than what you earned — that depends on what you bought and when.
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Record a Decision</Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                select
                fullWidth
                label="Category"
                value={draft.category}
                onChange={event => onDraftChange('category', event.target.value)}
              >
                {categories.map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label="Decision"
                value={draft.action}
                onChange={event => onDraftChange('action', event.target.value)}
              >
                <MenuItem value="buy">Buy</MenuItem>
                <MenuItem value="sell">Sell</MenuItem>
                <MenuItem value="hold">Hold</MenuItem>
              </TextField>
              <TextField
                select
                fullWidth
                label="Outcome"
                value={draft.status}
                onChange={event => onDraftChange('status', event.target.value)}
              >
                <MenuItem value="acted">Acted on it</MenuItem>
                <MenuItem value="proposed">Considering</MenuItem>
                <MenuItem value="declined">Decided against</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label={`Amount (${currency})`}
                value={draft.amount}
                onChange={event => onDraftChange('amount', event.target.value)}
                inputProps={{ inputMode: 'decimal' }}
                disabled={draft.action === 'hold'}
              />
            </Stack>

            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Why?"
              placeholder="What made this the right call, in your own words."
              value={draft.rationale}
              onChange={event => onDraftChange('rationale', event.target.value)}
              helperText="Required — an entry with no reasoning cannot be reviewed later."
            />

            {evidencePreview.length > 0 && (
              <Alert severity="info">
                <Typography variant="body2" gutterBottom>
                  These figures will be frozen into the entry:
                </Typography>
                {evidencePreview.map(line => (
                  <Typography key={line} variant="body2">
                    • {line}
                  </Typography>
                ))}
              </Alert>
            )}

            {draftIssues.length > 0 && (
              <Alert severity="warning">
                <Stack>
                  {draftIssues.map(issue => (
                    <Typography key={issue} variant="body2">
                      {issue}
                    </Typography>
                  ))}
                </Stack>
              </Alert>
            )}

            <Button
              variant="contained"
              onClick={onRecord}
              disabled={isSaving || draft.rationale.trim() === ''}
              sx={{ alignSelf: 'flex-start' }}
            >
              Record Decision
            </Button>
          </Stack>
        </Paper>

        {isLoading && <Typography variant="body2">Loading…</Typography>}

        <Stack spacing={2}>
          {entries.map(({ entry, review }) => {
            const verdict = VERDICT_LABELS[review.verdict] ?? {
              label: review.verdict,
              colour: 'default' as const,
            };
            return (
              <Card key={entry.id} variant="outlined">
                <CardContent>
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Chip
                        size="small"
                        color={
                          entry.action === 'buy'
                            ? 'primary'
                            : entry.action === 'sell'
                              ? 'warning'
                              : 'default'
                        }
                        label={entry.action.toUpperCase()}
                      />
                      <Typography variant="subtitle1">{entry.category}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {entry.createdAt.toISOString().slice(0, 10)} · {entry.status} ·{' '}
                        {formatAmount(entry.amount, entry.currency)}
                      </Typography>
                      <Box sx={{ flexGrow: 1 }} />
                      <Chip size="small" color={verdict.colour} label={verdict.label} />
                    </Stack>

                    <Typography variant="body2">{entry.rationale}</Typography>

                    <Divider />

                    <Typography variant="caption" color="text.secondary">
                      {review.benchmarkChangePercent === undefined
                        ? `${review.daysSince} days ago · no benchmark was recorded`
                        : `${review.daysSince} days ago · benchmark ${
                            review.benchmarkChangePercent >= 0 ? 'up' : 'down'
                          } ${Math.abs(review.benchmarkChangePercent)}% since`}
                      {entry.evidence.driftPercent !== undefined &&
                        ` · was ${entry.evidence.driftPercent > 0 ? '+' : ''}${entry.evidence.driftPercent}pt vs target`}
                      {entry.evidence.sentimentLabel && ` · news ${entry.evidence.sentimentLabel}`}
                    </Typography>

                    {entry.reviewNote && (
                      <Typography variant="body2" color="text.secondary">
                        Note: {entry.reviewNote}
                      </Typography>
                    )}

                    <Button
                      size="small"
                      color="error"
                      onClick={() => entry.id !== undefined && onDelete(entry.id)}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Delete
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
