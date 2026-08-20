import { Add as AddIcon } from '@mui/icons-material';
import { Box, Card, CardContent, Fab, List, Typography } from '@mui/material';
import { MonthlyExpense } from '../../../domain/entities/expenses/MonthlyExpense';
import { Currency } from '../../../domain/entities/shared/Currency';
import { CurrencyConverter } from '../../../domain/entities/shared/CurrencyConverter';
import { ExpenseFormContainer } from '../../containers/expense/ExpenseFormContainer';
import { MonthlyExpenseViewContainer } from '../../containers/expense/MonthlyExpenseViewContainer';
import { ExpenseCategoryChart } from '../views/ExpenseCategoryChart';
import { ExpenseChart } from '../views/MonthlyExpenseChart';

export interface ExpensesPageProps {
  monthlyExpenses: MonthlyExpense[];
  currency: Currency;
  converter: CurrencyConverter;
  showAddExpense: boolean;
  setShowAddExpense: (show: boolean) => void;
  deleteExpense: (id: number) => void;
  refresh: () => void;
}

export function ExpensesPage({
  monthlyExpenses,
  currency,
  converter,
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

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Monthly Expense Trends
            </Typography>
            <ExpenseChart
              monthlyExpenses={monthlyExpenses}
              currency={currency}
              converter={converter}
            />
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Expense Categories
            </Typography>
            <ExpenseCategoryChart
              monthlyExpenses={monthlyExpenses}
              currency={currency}
              converter={converter}
            />
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
