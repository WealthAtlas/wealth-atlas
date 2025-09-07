import { CalendarToday, Category, Delete, Edit } from '@mui/icons-material';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Expense } from '../../../domain/entities/expenses/Expense';
import { ExpenseFormContainer } from '../../containers/expense/ExpenseFormContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface ExpenseCardViewProps {
  expense: Expense;
  showExpenseEdit: boolean;
  setShowExpenseEdit: (show: boolean) => void;
  deleteExpense: (id: number) => void;
  refresh: () => void;
}

export function ExpenseCardView({
  expense,
  showExpenseEdit,
  setShowExpenseEdit,
  deleteExpense,
  refresh,
}: ExpenseCardViewProps) {
  return (
    <>
      {showExpenseEdit && (
        <ExpenseFormContainer
          open={showExpenseEdit}
          expenseToEdit={expense}
          onClose={() => {
            setShowExpenseEdit(false);
            refresh();
          }}
        />
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          width: '100%',
        }}
      >
        {/* Left section - Date and Category */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
            <CalendarToday sx={{ color: 'text.secondary', fontSize: 16 }} />
            <Typography variant="body2" color="text.secondary">
              {new Date(expense.date).toLocaleDateString()}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 140 }}>
            <Category sx={{ color: 'primary.main', fontSize: 16 }} />
            <Chip
              label={expense.category}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
            <Chip
              label={expense.isEssential ? 'Essential' : 'Non-Essential'}
              size="small"
              color={expense.isEssential ? 'success' : 'warning'}
              variant="filled"
              sx={{ fontWeight: 500 }}
            />
          </Box>
        </Box>

        {/* Middle section - Description */}
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: { xs: 'normal', sm: 'nowrap' },
            }}
          >
            {expense.description}
          </Typography>
        </Box>

        {/* Right section - Amount and Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 'fit-content' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              {UIUtils.formatCurrency(expense.amount, expense.currency)}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Edit Expense">
              <IconButton
                size="small"
                onClick={() => setShowExpenseEdit(true)}
                aria-label="edit expense"
                sx={{
                  backgroundColor: 'primary.50',
                  '&:hover': {
                    backgroundColor: 'primary.100',
                    transform: 'scale(1.1)',
                  },
                }}
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
                sx={{
                  backgroundColor: 'error.50',
                  '&:hover': {
                    backgroundColor: 'error.100',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Box>
    </>
  );
}
