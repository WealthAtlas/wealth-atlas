import { ExpandLess, ExpandMore } from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Table,
  TableContainer,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { MonthlyExpense } from '../../../domain/entities/expenses/MonthlyExpense';
import { UIUtils } from '../../utils/UIUtils';
import { ExpenseView } from './ExpenseView';

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
      elevation={2}
      sx={{
        mb: 3,
        borderRadius: 2,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 6,
        },
      }}
    >
      <CardContent
        sx={{
          p: 2,
          '&:last-child': { pb: 2 },
          cursor: 'pointer',
        }}
        onClick={toggleExpand}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {UIUtils.formatMonth(monthlyExpense.month)}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`${monthlyExpense.expenses.length} expenses`}
                size="small"
                color="default"
                variant="outlined"
              />
              <Tooltip
                title={
                  hasMultipleCurrencies
                    ? 'Multiple currencies - click to see breakdown'
                    : 'Total expenses this month'
                }
              >
                <Chip
                  label={getTotalForDisplay()}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: hasMultipleCurrencies ? 'bold' : 'normal' }}
                />
              </Tooltip>
              {hasMultipleCurrencies && (
                <Chip
                  label={`${uniqueCurrencies.length} currencies`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                  sx={{
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.7 },
                      '100%': { opacity: 1 },
                    },
                  }}
                />
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              onClick={e => {
                e.stopPropagation();
                toggleExpand();
              }}
              color="primary"
              sx={{ ml: 1 }}
            >
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        {/* Essential vs Non-essential breakdown */}
        <Box sx={{ mt: 2 }}>
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
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Essential vs Non-essential
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {essentialPercentage}% essential
                    </Typography>
                  </Box>

                  <Tooltip
                    title={`Essential: ${UIUtils.formatCurrency(essentialAmount, currency)} | Non-essential: ${UIUtils.formatCurrency(nonEssentialAmount, currency)}`}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        height: 12,
                        width: '100%',
                        bgcolor: 'grey.200',
                        borderRadius: 6,
                        overflow: 'hidden',
                        border: 1,
                        borderColor: 'grey.300',
                      }}
                    >
                      {essentialAmount > 0 && (
                        <Box
                          sx={{
                            height: '100%',
                            width: `${essentialPercentage}%`,
                            bgcolor: 'success.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: essentialPercentage > 10 ? 'auto' : 0,
                          }}
                        />
                      )}
                      {nonEssentialAmount > 0 && (
                        <Box
                          sx={{
                            height: '100%',
                            width: `${100 - essentialPercentage}%`,
                            bgcolor: 'warning.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 100 - essentialPercentage > 10 ? 'auto' : 0,
                          }}
                        />
                      )}
                    </Box>
                  </Tooltip>
                </>
              );
            })()
          ) : (
            // Multiple currencies view - show summary
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Multiple Currencies ({uniqueCurrencies.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {uniqueCurrencies.map(currency => (
                  <Chip
                    key={currency}
                    label={UIUtils.formatCurrency(
                      monthlyExpense.getTotalAmountByCurrency(currency),
                      currency
                    )}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </>
          )}
        </Box>
      </CardContent>

      {isExpanded && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            {!hasMultipleCurrencies ? (
              // Single currency detailed view
              (() => {
                const currency = uniqueCurrencies[0];
                const essentialAmount = monthlyExpense.getEssentialAmountByCurrency(currency);
                const nonEssentialAmount = monthlyExpense.getNonEssentialAmountByCurrency(currency);
                const totalAmount = monthlyExpense.getTotalAmountByCurrency(currency);

                return (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Tooltip title="Essential expenses">
                        <Box
                          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Essential
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                            {UIUtils.formatCurrency(essentialAmount, currency)}
                          </Typography>
                        </Box>
                      </Tooltip>

                      <Tooltip title="Non-essential expenses">
                        <Box
                          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Non-essential
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="bold" color="warning.main">
                            {UIUtils.formatCurrency(nonEssentialAmount, currency)}
                          </Typography>
                        </Box>
                      </Tooltip>

                      <Tooltip title="Total expenses">
                        <Box
                          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Total
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                            {UIUtils.formatCurrency(totalAmount, currency)}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Box>

                    <TableContainer>
                      <Table size="small">
                        {monthlyExpense.expenses.map(expense => (
                          <ExpenseView
                            key={expense.id}
                            expense={expense}
                            refresh={refresh}
                            deleteExpense={deleteExpense}
                          />
                        ))}
                      </Table>
                    </TableContainer>
                  </>
                );
              })()
            ) : (
              // Multiple currencies detailed view
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                    <Box
                      key={currency}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 2.5,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 2,
                        }}
                      >
                        <Typography variant="h6" fontWeight="bold" color="text.primary">
                          {currency}
                        </Typography>
                        <Chip
                          label={UIUtils.formatCurrency(currencyTotal, currency)}
                          color="primary"
                          size="medium"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                          gap: 2,
                          mb: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            p: 1,
                            bgcolor: 'success.50',
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Essential
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                            {UIUtils.formatCurrency(currencyEssential, currency)}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            p: 1,
                            bgcolor: 'warning.50',
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Non-essential
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="bold" color="warning.main">
                            {UIUtils.formatCurrency(currencyNonEssential, currency)}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            p: 1,
                            bgcolor: 'info.50',
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Essential Ratio
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="bold" color="info.main">
                            {currencyEssentialPercentage}%
                          </Typography>
                        </Box>
                      </Box>

                      <TableContainer>
                        <Table size="small">
                          {currencyExpenses.map(expense => (
                            <ExpenseView
                              key={expense.id}
                              expense={expense}
                              refresh={refresh}
                              deleteExpense={deleteExpense}
                            />
                          ))}
                        </Table>
                      </TableContainer>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </>
      )}
    </Card>
  );
}
