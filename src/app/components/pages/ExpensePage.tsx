import { Add as AddIcon } from '@mui/icons-material';
import { Box, Card, CardContent, Fab, List, Typography } from '@mui/material';
import React from 'react';
import { MonthlyExpense } from '../../../domain/entities/expenses/MonthlyExpense';
import { ExpenseFormContainer } from '../../containers/expense/ExpenseFormContainer';
import { ExpenseCategoryChart } from '../views/ExpenseCategoryChart';
import { ExpenseChart } from '../views/MonthlyExpenseChart';
import { MonthlyExpenseView } from '../views/MonthlyExpenseView';

export interface ExpensesPageProps {
  monthlyExpenses: MonthlyExpense[];
  deleteExpense: (id: number) => void;
  refresh: () => void;
}

export function ExpensesPage({ monthlyExpenses, deleteExpense, refresh }: ExpensesPageProps) {
  const [showAddExpense, setShowAddExpense] = React.useState(false);

  return (
    <>
      <ExpenseFormContainer
        open={showAddExpense}
        expenseToEdit={undefined}
        onClose={() => setShowAddExpense(false)}
        onSuccess={() => refresh()}
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
            <ExpenseChart monthlyExpenses={monthlyExpenses} />
          </CardContent>
        </Card>

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
                  <MonthlyExpenseView
                    key={monthlyExpense.month.toISOString()}
                    monthlyExpense={monthlyExpense}
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
