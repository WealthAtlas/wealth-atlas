import { Currency } from '@/domain/entities/shared/Currency';
import {
  AttachMoney,
  CheckCircle,
  ExpandLess,
  ExpandMore,
  ShoppingCart,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { MonthlyExpense } from '../../../domain/entities/expenses/MonthlyExpense';
import { ExpenseCardContainer } from '../../containers/expense/ExpenseCardContainer';
import { UIUtils } from '../../utils/UIUtils';

/** A month's spend in one currency. Nothing converts, so these never merge. */
export interface MonthlyCurrencyTotals {
  currency: Currency;
  total: number;
  essential: number;
  nonEssential: number;
}

export interface MonthlyExpenseViewProps {
  monthlyExpense: MonthlyExpense;
  /**
   * One entry per currency spent this month, largest first. An expense is left
   * in the currency it was paid in, so a month spent in two currencies gets two
   * totals side by side rather than one blended figure — a rate would restate
   * what was actually spent.
   */
  currencyTotals: MonthlyCurrencyTotals[];
  deleteExpense: (id: number) => void;
  refresh: () => void;
}

function essentialShare(totals: MonthlyCurrencyTotals): number {
  return totals.total > 0 ? Math.round((totals.essential / totals.total) * 100) : 0;
}

/**
 * The essential/non-essential split for one currency. Rendered once per currency
 * present, with the code shown only when there is more than one — a single
 * currency month should read exactly as it always did.
 */
function CurrencyBreakdown({
  totals,
  showCurrency,
}: {
  totals: MonthlyCurrencyTotals;
  showCurrency: boolean;
}) {
  const percentage = essentialShare(totals);

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2.5,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 2,
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
          <Typography variant="h6" color="text.primary" fontWeight={600}>
            {showCurrency ? `Expense Breakdown (${totals.currency})` : 'Expense Breakdown'}
          </Typography>
        </Box>
        <Chip
          label={`${percentage}% essential`}
          color={percentage > 70 ? 'success' : percentage > 50 ? 'warning' : 'error'}
          size="small"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" fontWeight="bold" color="success.main">
              {UIUtils.formatCurrency(totals.essential, totals.currency)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Essential
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" fontWeight="bold" color="warning.main">
              {UIUtils.formatCurrency(totals.nonEssential, totals.currency)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Non-essential
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ position: 'relative', mb: 1 }}>
        <LinearProgress
          variant="determinate"
          value={100}
          sx={{
            height: 16,
            borderRadius: 8,
            backgroundColor: 'warning.light',
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'transparent',
            },
          }}
        />
        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 16,
            borderRadius: 8,
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'success.main',
              borderRadius: 8,
            },
          }}
        />
        {percentage > 15 && (
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          >
            {percentage}%
          </Typography>
        )}
        {100 - percentage > 15 && (
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          >
            {100 - percentage}%
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

/** The three headline figures for one currency, shown when the card is expanded. */
function CurrencySummaryCards({
  totals,
  showCurrency,
}: {
  totals: MonthlyCurrencyTotals;
  showCurrency: boolean;
}) {
  const suffix = showCurrency ? ` (${totals.currency})` : '';

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={4}>
        <Paper
          elevation={2}
          sx={{
            p: 2,
            textAlign: 'center',
            borderRadius: 2,
            background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
            border: '1px solid rgba(76, 175, 80, 0.2)',
          }}
        >
          <CheckCircle sx={{ color: 'success.main', fontSize: 32, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="success.main">
            {UIUtils.formatCurrency(totals.essential, totals.currency)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Essential Expenses{suffix}
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={4}>
        <Paper
          elevation={2}
          sx={{
            p: 2,
            textAlign: 'center',
            borderRadius: 2,
            background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc02 30%)',
            border: '1px solid rgba(255, 152, 0, 0.2)',
          }}
        >
          <Warning sx={{ color: 'warning.main', fontSize: 32, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="warning.main">
            {UIUtils.formatCurrency(totals.nonEssential, totals.currency)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Non-essential Expenses{suffix}
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={4}>
        <Paper
          elevation={2}
          sx={{
            p: 2,
            textAlign: 'center',
            borderRadius: 2,
            background: 'linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%)',
            border: '1px solid rgba(33, 150, 243, 0.2)',
          }}
        >
          <TrendingUp sx={{ color: 'primary.main', fontSize: 32, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="primary.main">
            {UIUtils.formatCurrency(totals.total, totals.currency)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Expenses{suffix}
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
}

export function MonthlyExpenseView({
  monthlyExpense,
  currencyTotals,
  deleteExpense,
  refresh,
}: MonthlyExpenseViewProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const isMultiCurrency = currencyTotals.length > 1;

  return (
    <Card
      elevation={3}
      sx={{
        mb: 3,
        borderRadius: 3,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          elevation: 8,
          transform: 'translateY(-2px)',
        },
        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
        border: '1px solid rgba(0, 0, 0, 0.04)',
      }}
    >
      <CardContent
        sx={{
          p: 3,
          '&:last-child': { pb: 3 },
          cursor: 'pointer',
        }}
        onClick={toggleExpand}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AttachMoney sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                  {UIUtils.formatMonth(monthlyExpense.month)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Monthly expense summary
                </Typography>
              </Box>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip
                icon={<ShoppingCart fontSize="small" />}
                label={`${monthlyExpense.expenses.length} expenses`}
                size="medium"
                color="primary"
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: 'primary.main' },
                }}
              />
              {/* One chip per currency: two of them is the honest reading of a
                  month spent in two currencies, and there is no total to blend. */}
              {currencyTotals.map(totals => (
                <Tooltip key={totals.currency} title={`Total ${totals.currency} spent this month`}>
                  <Chip
                    icon={<TrendingUp fontSize="small" />}
                    label={UIUtils.formatCurrency(totals.total, totals.currency)}
                    color="success"
                    size="medium"
                    sx={{
                      fontWeight: 600,
                      '& .MuiChip-icon': { color: 'success.contrastText' },
                    }}
                  />
                </Tooltip>
              ))}
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              onClick={e => {
                e.stopPropagation();
                toggleExpand();
              }}
              color="primary"
              sx={{
                ml: 1,
                backgroundColor: 'primary.50',
                '&:hover': {
                  backgroundColor: 'primary.100',
                  transform: 'scale(1.1)',
                },
              }}
            >
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        {/* Essential vs Non-essential breakdown, per currency */}
        <Stack spacing={2} sx={{ mt: 3 }}>
          {currencyTotals.map(totals => (
            <CurrencyBreakdown
              key={totals.currency}
              totals={totals}
              showCurrency={isMultiCurrency}
            />
          ))}
        </Stack>
      </CardContent>

      {isExpanded && (
        <>
          <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.08)' }} />
          <Box sx={{ p: 3 }}>
            {currencyTotals.map(totals => (
              <CurrencySummaryCards
                key={totals.currency}
                totals={totals}
                showCurrency={isMultiCurrency}
              />
            ))}

            {/* Individual Expenses */}
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <ShoppingCart sx={{ color: 'primary.main' }} />
              Individual Expenses
            </Typography>
            <Stack spacing={1.5}>
              {monthlyExpense.getSortedExpenses().map(expense => (
                <Box
                  key={expense.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    },
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    backgroundColor: 'background.paper',
                  }}
                >
                  <ExpenseCardContainer
                    expenseId={expense.id!}
                    deleteExpense={deleteExpense}
                    refresh={refresh}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        </>
      )}
    </Card>
  );
}
