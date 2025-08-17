import { Expense } from '@/domain/entities/Expense';
import { EXPENSE_CATEGORY_LABELS } from '@/domain/entities/ExpenseCategory';
import {
  CurrencyTotalSummary,
  MonthlyExpenseSummary,
} from '@/domain/services/ExpenseAnalyticsService';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Fab,
  Grid,
  IconButton,
  List,
  ListItem,
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
  loading?: boolean;
}

export function ExpensesPage({
  expenses,
  monthlyData,
  currencyTotals,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}: ExpensesPageProps) {
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

  return (
    <Box sx={{ p: 3, pb: 10 }}>
      <Typography variant="h4" gutterBottom>
        Expenses
      </Typography>

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

      {/* Recent Expenses */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Expenses
          </Typography>
          {expenses.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Typography variant="body1">No expenses recorded yet.</Typography>
              <Typography variant="body2">Click the + button to add your first expense.</Typography>
            </Box>
          ) : (
            <List>
              {expenses.slice(0, 10).map((expense, index) => (
                <React.Fragment key={expense.id || index}>
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
                  {index < Math.min(expenses.length - 1, 9) && <Divider />}
                </React.Fragment>
              ))}
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
