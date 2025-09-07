import {
  AccountBalance,
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

export interface MonthlyExpenseViewProps {
  monthlyExpense: MonthlyExpense;
  deleteExpense: (id: number) => void;
  refresh: () => void;
}

export function MonthlyExpenseView({
  monthlyExpense,
  deleteExpense,
  refresh,
}: MonthlyExpenseViewProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  // Check if we have multiple currencies
  const hasMultipleCurrencies = monthlyExpense.hasMultipleCurrencies();
  const uniqueCurrencies = monthlyExpense.getUniqueCurrencies();

  // Calculate totals for display
  const getTotalForDisplay = () => {
    if (!hasMultipleCurrencies) {
      // For single currency, show the total with that currency
      const currency = uniqueCurrencies[0];
      return UIUtils.formatCurrency(monthlyExpense.getTotalAmountByCurrency(currency), currency);
    }

    // For multiple currencies, show count of currencies and total expenses
    return `${monthlyExpense.expenses.length} expenses in ${uniqueCurrencies.length} currencies`;
  };

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
              <Tooltip
                title={
                  hasMultipleCurrencies
                    ? 'Multiple currencies - click to see breakdown'
                    : 'Total expenses this month'
                }
              >
                <Chip
                  icon={<TrendingUp fontSize="small" />}
                  label={getTotalForDisplay()}
                  color="success"
                  size="medium"
                  sx={{
                    fontWeight: hasMultipleCurrencies ? 700 : 600,
                    '& .MuiChip-icon': { color: 'success.contrastText' },
                  }}
                />
              </Tooltip>
              {hasMultipleCurrencies && (
                <Chip
                  icon={<AccountBalance fontSize="small" />}
                  label={`${uniqueCurrencies.length} currencies`}
                  size="medium"
                  color="secondary"
                  variant="outlined"
                  sx={{
                    fontWeight: 600,
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1, transform: 'scale(1)' },
                      '50%': { opacity: 0.8, transform: 'scale(1.02)' },
                      '100%': { opacity: 1, transform: 'scale(1)' },
                    },
                    '& .MuiChip-icon': { color: 'secondary.main' },
                  }}
                />
              )}
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

        {/* Essential vs Non-essential breakdown */}
        <Box sx={{ mt: 3 }}>
          {!hasMultipleCurrencies ? (
            // Single currency view
            (() => {
              const currency = uniqueCurrencies[0];
              const essentialAmount = monthlyExpense.getEssentialAmountByCurrency(currency);
              const nonEssentialAmount = monthlyExpense.getNonEssentialAmountByCurrency(currency);
              const totalAmount = monthlyExpense.getTotalAmountByCurrency(currency);
              const essentialPercentage =
                totalAmount > 0 ? Math.round((essentialAmount / totalAmount) * 100) : 0;

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
                        Expense Breakdown
                      </Typography>
                    </Box>
                    <Chip
                      label={`${essentialPercentage}% essential`}
                      color={
                        essentialPercentage > 70
                          ? 'success'
                          : essentialPercentage > 50
                            ? 'warning'
                            : 'error'
                      }
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight="bold" color="success.main">
                          {UIUtils.formatCurrency(essentialAmount, currency)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Essential
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight="bold" color="warning.main">
                          {UIUtils.formatCurrency(nonEssentialAmount, currency)}
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
                      value={essentialPercentage}
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
                    {essentialPercentage > 15 && (
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
                        {essentialPercentage}%
                      </Typography>
                    )}
                    {100 - essentialPercentage > 15 && (
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
                        {100 - essentialPercentage}%
                      </Typography>
                    )}
                  </Box>
                </Paper>
              );
            })()
          ) : (
            // Multiple currencies view - show summary
            <Paper
              elevation={1}
              sx={{
                p: 2.5,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AccountBalance sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="h6" color="text.primary" fontWeight={600}>
                  Multiple Currencies ({uniqueCurrencies.length})
                </Typography>
              </Box>
              <Grid container spacing={1}>
                {uniqueCurrencies.map(currency => (
                  <Grid item xs={6} sm={4} md={3} key={currency}>
                    <Chip
                      label={UIUtils.formatCurrency(
                        monthlyExpense.getTotalAmountByCurrency(currency),
                        currency
                      )}
                      size="medium"
                      color="primary"
                      variant="outlined"
                      sx={{
                        width: '100%',
                        fontWeight: 600,
                        '& .MuiChip-label': {
                          fontSize: '0.8rem',
                        },
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </Box>
      </CardContent>

      {isExpanded && (
        <>
          <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.08)' }} />
          <Box sx={{ p: 3 }}>
            {!hasMultipleCurrencies ? (
              // Single currency detailed view
              (() => {
                const currency = uniqueCurrencies[0];
                const essentialAmount = monthlyExpense.getEssentialAmountByCurrency(currency);
                const nonEssentialAmount = monthlyExpense.getNonEssentialAmountByCurrency(currency);
                const totalAmount = monthlyExpense.getTotalAmountByCurrency(currency);

                return (
                  <>
                    {/* Summary Cards */}
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
                            {UIUtils.formatCurrency(essentialAmount, currency)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Essential Expenses
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
                            {UIUtils.formatCurrency(nonEssentialAmount, currency)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Non-essential Expenses
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
                            {UIUtils.formatCurrency(totalAmount, currency)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Expenses
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>

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
                      {monthlyExpense.expenses.map(expense => (
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
                            expense={expense}
                            refresh={refresh}
                            deleteExpense={deleteExpense}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </>
                );
              })()
            ) : (
              // Multiple currencies detailed view
              <Stack spacing={3}>
                {uniqueCurrencies.map(currency => {
                  const currencyExpenses =
                    monthlyExpense.getExpensesByCurrency().get(currency) || [];
                  const currencyTotal = monthlyExpense.getTotalAmountByCurrency(currency);
                  const currencyEssential = monthlyExpense.getEssentialAmountByCurrency(currency);
                  const currencyNonEssential =
                    monthlyExpense.getNonEssentialAmountByCurrency(currency);
                  const currencyEssentialPercentage =
                    currencyTotal > 0 ? Math.round((currencyEssential / currencyTotal) * 100) : 0;

                  return (
                    <Paper
                      key={currency}
                      elevation={2}
                      sx={{
                        borderRadius: 3,
                        p: 3,
                        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 3,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 2,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <AccountBalance sx={{ color: 'white', fontSize: 20 }} />
                          </Box>
                          <Typography variant="h5" fontWeight="bold" color="text.primary">
                            {currency}
                          </Typography>
                        </Box>
                        <Chip
                          label={UIUtils.formatCurrency(currencyTotal, currency)}
                          color="primary"
                          size="medium"
                          sx={{
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            height: 36,
                          }}
                        />
                      </Box>

                      {/* Currency Summary Cards */}
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={4}>
                          <Paper
                            elevation={1}
                            sx={{
                              p: 2,
                              textAlign: 'center',
                              borderRadius: 2,
                              background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
                              border: '1px solid rgba(76, 175, 80, 0.2)',
                            }}
                          >
                            <CheckCircle sx={{ color: 'success.main', fontSize: 28, mb: 1 }} />
                            <Typography variant="h6" fontWeight="bold" color="success.main">
                              {UIUtils.formatCurrency(currencyEssential, currency)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Essential ({currencyEssentialPercentage}%)
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Paper
                            elevation={1}
                            sx={{
                              p: 2,
                              textAlign: 'center',
                              borderRadius: 2,
                              background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc02 30%)',
                              border: '1px solid rgba(255, 152, 0, 0.2)',
                            }}
                          >
                            <Warning sx={{ color: 'warning.main', fontSize: 28, mb: 1 }} />
                            <Typography variant="h6" fontWeight="bold" color="warning.main">
                              {UIUtils.formatCurrency(currencyNonEssential, currency)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Non-essential ({100 - currencyEssentialPercentage}%)
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Paper
                            elevation={1}
                            sx={{
                              p: 2,
                              textAlign: 'center',
                              borderRadius: 2,
                              background: 'linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%)',
                              border: '1px solid rgba(33, 150, 243, 0.2)',
                            }}
                          >
                            <TrendingUp sx={{ color: 'primary.main', fontSize: 28, mb: 1 }} />
                            <Typography variant="h6" fontWeight="bold" color="primary.main">
                              {currencyExpenses.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Total Expenses
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* Individual Expenses for this currency */}
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <ShoppingCart sx={{ color: 'primary.main' }} />
                        {currency} Expenses
                      </Typography>
                      <Stack spacing={1.5}>
                        {currencyExpenses.map(expense => (
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
                              expense={expense}
                              refresh={refresh}
                              deleteExpense={deleteExpense}
                            />
                          </Box>
                        ))}
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>
        </>
      )}
    </Card>
  );
}
