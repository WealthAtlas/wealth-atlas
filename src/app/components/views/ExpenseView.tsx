import { Delete, Edit } from '@mui/icons-material';
import { Box, Chip, IconButton, TableCell, TableRow, Tooltip, Typography } from '@mui/material';
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
      <TableRow key={expense.id} hover sx={{ width: '100%' }}>
        <TableCell sx={{ width: '15%' }}>
          <Typography variant="body2" color="text.secondary">
            {new Date(expense.date).toLocaleDateString()}
          </Typography>
        </TableCell>
        <TableCell sx={{ width: '15%' }}>
          <Chip label={expense.category} size="small" color="primary" variant="outlined" />
        </TableCell>
        <TableCell sx={{ width: '15%' }}>
          <Chip
            label={expense.isEssential ? 'Essential' : 'Non-Essential'}
            size="small"
            color={expense.isEssential ? 'success' : 'default'}
            variant="filled"
          />
        </TableCell>
        <TableCell sx={{ width: '40%' }}>
          <Typography variant="body2" noWrap>
            {expense.description}
          </Typography>
        </TableCell>
        <TableCell align="right" sx={{ width: '10%' }}>
          <Typography variant="body2" fontWeight="bold">
            {UIUtils.formatCurrency(expense.amount, expense.currency)}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ width: '5%' }}>
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
