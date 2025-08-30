import { Delete, Edit } from '@mui/icons-material';
import { Box, Chip, IconButton, TableCell, TableRow, Tooltip } from '@mui/material';
import { useState } from 'react';
import { Expense } from '../../../domain/entities/expenses/Expense';
import { ExpenseFormContainer } from '../../containers/expense/ExpenseFormContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface ExpenseViewProps {
  expense: Expense;
  deleteExpense: (id: number) => void;
  refresh: () => void;
}

export function ExpenseView({ expense, deleteExpense, refresh }: ExpenseViewProps) {
  const [showExpenseEdit, setShowExpenseEdit] = useState<boolean>(false);

  return (
    <>
      {showExpenseEdit && (
        <ExpenseFormContainer
          open={showExpenseEdit}
          expenseToEdit={expense}
          onClose={() => setShowExpenseEdit(false)}
          onSuccess={() => {
            setShowExpenseEdit(false);
            refresh();
          }}
        />
      )}
      <TableRow key={expense.id}>
        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
        <TableCell>{expense.category}</TableCell>
        <TableCell>
          <Chip
            label={expense.isEssential ? 'Essential' : 'Non-Essential'}
            size="small"
            color={expense.isEssential ? 'success' : 'default'}
            variant="outlined"
          />
        </TableCell>
        <TableCell>{expense.description}</TableCell>
        <TableCell align="right">
          {UIUtils.formatCurrency(expense.amount, expense.currency)}
        </TableCell>
        <TableCell align="center">
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            <Tooltip title="Edit Expense">
              <IconButton
                size="small"
                onClick={() => setShowExpenseEdit(true)}
                aria-label="edit expense"
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Expense">
              <IconButton
                size="small"
                onClick={() => deleteExpense(expense.id!)}
                aria-label="delete expense"
                color="error"
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>
    </>
  );
}
