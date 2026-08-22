import { Add as AddIcon } from '@mui/icons-material';
import { Box, Card, CardContent, Fab, List, Typography } from '@mui/material';
import { MonthlyExpense } from '../../../domain/entities/expenses/MonthlyExpense';
import { Currency } from '../../../domain/entities/shared/Currency';
import { ExpenseFormContainer } from '../../containers/expense/ExpenseFormContainer';
import { MonthlyExpenseViewContainer } from '../../containers/expense/MonthlyExpenseViewContainer';
import { ExpenseCategoryChart } from '../views/ExpenseCategoryChart';
import { ExpenseChart } from '../views/MonthlyExpenseChart';

export interface ExpensesPageProps {
  monthlyExpenses: MonthlyExpense[];
  /**
   * Every currency spent in, largest first. Expenses are never converted, so the
   * trend chart is drawn once per currency instead of once for a blended total.
   */
  currencies: Currency[];
  showAddExpense: boolean;
  setShowAddExpense: (show: boolean) => void;
  deleteExpense: (id: number) => void;
  refresh: () => void;
}

export function ExpensesPage({
  monthlyExpenses,
  currencies,
  showAddExpense,
  setShowAddExpense,
  deleteExpense,
  refresh,
}: ExpensesPageProps) {
  return (
    <>
      <ExpenseFormContainer
        open={showAddExpense}
        expenseToEdit={undefined}
        onClose={() => {
          setShowAddExpense(false);
          refresh();
        }}
      />
      <Box sx={{ p: 3, pb: 10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Expenses</Typography>
        </Box>

        {currencies.length === 0 ? (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Expense Trends
              </Typography>
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Typography variant="body1">No expense data available</Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          // One chart per currency. Stacking currencies into one chart is what
          // made a month's spend unreadable, and blending them needs a rate.
          currencies.map(currency => (
            <Card key={currency} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {currencies.length > 1
                    ? `Monthly Expense Trends (${currency})`
                    : 'Monthly Expense Trends'}
                </Typography>
                <ExpenseChart monthlyExpenses={monthlyExpenses} currency={currency} />
              </CardContent>
            </Card>
          ))
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Expense Categories
            </Typography>
            <ExpenseCategoryChart monthlyExpenses={monthlyExpenses} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Expenses by Month
            </Typography>
            {monthlyExpenses.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Typography variant="body1">No expenses recorded yet.</Typography>
              </Box>
            ) : (
              <List>
                {monthlyExpenses.map(monthlyExpense => (
                  <MonthlyExpenseViewContainer
                    key={monthlyExpense.month.toISOString()}
                    month={monthlyExpense.month}
                    deleteExpense={deleteExpense}
                    refresh={refresh}
                  />
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        <Fab
          color="primary"
          aria-label="add expense"
          onClick={() => setShowAddExpense(true)}
          sx={{ position: 'fixed', bottom: 80, right: 16 }}
        >
          <AddIcon />
        </Fab>
      </Box>
    </>
  );
}
