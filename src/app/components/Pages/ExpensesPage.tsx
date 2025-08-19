import { Expense } from '@/domain/entities/expenses/Expense';
import { EXPENSE_CATEGORY_LABELS } from '@/domain/entities/expenses/ExpenseCategory';
import {
  CurrencyTotalSummary,
  MonthlyExpenseSummary,
} from '@/domain/services/ExpenseAnalyticsService';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  Fab,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
  Typography,
} from '@mui/material';
import React from 'react';
import { ExpenseChart } from '../Charts/ExpenseChart';

interface ExpensesPageProps {
  expenses: Expense[];
  monthlyData: MonthlyExpenseSummary[];
  currencyTotals: CurrencyTotalSummary[];
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  onManageScheduledExpenses: () => void;
  loading?: boolean;
}

export function ExpensesPage({
  expenses,
  monthlyData,
  currencyTotals,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onManageScheduledExpenses,
}: ExpensesPageProps) {
  // Auto-expand current month by default
  const currentMonthYear = new Date().toISOString().slice(0, 7); // YYYY-MM format
  const [expandedMonths, setExpandedMonths] = React.useState<Set<string>>(
    new Set([currentMonthYear])
  );

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  // Group expenses by month-year
  const groupedExpenses = React.useMemo(() => {
    const grouped = new Map<string, Expense[]>();

    // Sort expenses by date (newest first)
    const sortedExpenses = [...expenses].sort((a, b) => b.date.getTime() - a.date.getTime());

    sortedExpenses.forEach(expense => {
      const monthYear = expense.getMonthYear();
      if (!grouped.has(monthYear)) {
        grouped.set(monthYear, []);
      }
      grouped.get(monthYear)!.push(expense);
    });

    return grouped;
  }, [expenses]);

  // Calculate month summary for each group
  const getMonthSummary = (monthExpenses: Expense[]) => {
    const totalAmount = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const essentialAmount = monthExpenses
      .filter(expense => expense.isEssential)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const currencies = [...new Set(monthExpenses.map(expense => expense.currency))];

    return {
      totalAmount,
      essentialAmount,
      nonEssentialAmount: totalAmount - essentialAmount,
      currencies,
      count: monthExpenses.length,
    };
  };

  const toggleMonth = (monthYear: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthYear)) {
      newExpanded.delete(monthYear);
    } else {
      newExpanded.add(monthYear);
    }
    setExpandedMonths(newExpanded);
  };

  return (
    <Box sx={{ p: 3, pb: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Expenses</Typography>
        <Button variant="outlined" startIcon={<ScheduleIcon />} onClick={onManageScheduledExpenses}>
          Scheduled Expenses
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {currencyTotals.map(summary => (
          <Grid item xs={12} sm={6} md={4} key={summary.currency}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {summary.currency} Total
                </Typography>
                <Typography variant="h4" color="primary" gutterBottom>
                  {formatCurrency(summary.totalAmount, summary.currency)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Essential: ${formatCurrency(summary.essentialAmount, summary.currency)}`}
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    label={`Non-Essential: ${formatCurrency(summary.nonEssentialAmount, summary.currency)}`}
                    color="warning"
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Expense Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Monthly Expense Trends
          </Typography>
          <ExpenseChart monthlyData={monthlyData} />
        </CardContent>
      </Card>

      {/* Monthly Expenses */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Expenses by Month
          </Typography>
          {groupedExpenses.size === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Typography variant="body1">No expenses recorded yet.</Typography>
              <Typography variant="body2">Click the + button to add your first expense.</Typography>
            </Box>
          ) : (
            <List>
              {Array.from(groupedExpenses.entries()).map(
                ([monthYear, monthExpenses], monthIndex) => {
                  const summary = getMonthSummary(monthExpenses);
                  const isExpanded = expandedMonths.has(monthYear);
                  const monthDate = new Date(monthYear + '-01');

                  return (
                    <React.Fragment key={monthYear}>
                      {/* Month Header */}
                      <ListItem disablePadding>
                        <ListItemButton onClick={() => toggleMonth(monthYear)}>
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <Typography variant="h6">{formatMonthYear(monthDate)}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {summary.count} expenses
                                  </Typography>
                                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </Box>
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                {summary.currencies.map(currency => (
                                  <Chip
                                    key={currency}
                                    label={`${currency} ${monthExpenses
                                      .filter(e => e.currency === currency)
                                      .reduce((sum, e) => sum + e.amount, 0)
                                      .toLocaleString()}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                ))}
                                <Chip
                                  label={`Essential: ${summary.essentialAmount.toLocaleString()}`}
                                  color="success"
                                  size="small"
                                  variant="outlined"
                                />
                                <Chip
                                  label={`Non-Essential: ${summary.nonEssentialAmount.toLocaleString()}`}
                                  color="warning"
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                            }
                          />
                        </ListItemButton>
                      </ListItem>

                      {/* Month Expenses (Collapsible) */}
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <List sx={{ pl: 2 }}>
                          {monthExpenses.map((expense, expenseIndex) => (
                            <React.Fragment key={expense.id || expenseIndex}>
                              <ListItem>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="subtitle1">
                                        {formatCurrency(expense.amount, expense.currency)}
                                      </Typography>
                                      <Chip
                                        label={EXPENSE_CATEGORY_LABELS[expense.category]}
                                        size="small"
                                        variant="outlined"
                                      />
                                      <Chip
                                        label={expense.isEssential ? 'Essential' : 'Non-Essential'}
                                        color={expense.isEssential ? 'success' : 'warning'}
                                        size="small"
                                      />
                                    </Box>
                                  }
                                  secondary={
                                    <Box>
                                      <Typography variant="body2" color="text.secondary">
                                        {formatDate(expense.date)}
                                      </Typography>
                                      {expense.description && (
                                        <Typography variant="body2" color="text.secondary">
                                          {expense.description}
                                        </Typography>
                                      )}
                                    </Box>
                                  }
                                />
                                <ListItemSecondaryAction>
                                  <IconButton
                                    edge="end"
                                    aria-label="edit"
                                    onClick={() => onEditExpense(expense)}
                                    sx={{ mr: 1 }}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton
                                    edge="end"
                                    aria-label="delete"
                                    onClick={() => onDeleteExpense(expense)}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </ListItemSecondaryAction>
                              </ListItem>
                              {expenseIndex < monthExpenses.length - 1 && (
                                <Divider variant="inset" />
                              )}
                            </React.Fragment>
                          ))}
                        </List>
                      </Collapse>

                      {monthIndex < groupedExpenses.size - 1 && <Divider sx={{ my: 1 }} />}
                    </React.Fragment>
                  );
                }
              )}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Add Expense FAB */}
      <Fab
        color="primary"
        aria-label="add expense"
        onClick={onAddExpense}
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 16,
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}
