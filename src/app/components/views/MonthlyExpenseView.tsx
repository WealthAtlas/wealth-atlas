import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { Box, Chip, Divider, IconButton, List, ListItem, Typography } from '@mui/material';
import { useState } from 'react';
import { MonthlyExpense } from '../../../domain/entities/expenses/MonthlyExpense';
import { ExpenseViewContainer } from '../../containers/expense/ExpenseViewContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface MonthlyExpenseViewProps {
  monthlyExpense: MonthlyExpense;
  refresh: () => void;
}

export function MonthlyExpenseView({ monthlyExpense, refresh }: MonthlyExpenseViewProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <Box
      sx={{ mb: 2, border: 1, borderColor: 'divider', borderRadius: 1, p: 2, cursor: 'pointer' }}
      onClick={toggleExpand}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {UIUtils.formatMonth(monthlyExpense.month)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Chip
              label={`Total: ${monthlyExpense.getTotalExpenses().toLocaleString()}`}
              color="primary"
              size="small"
              sx={{ mt: 1 }}
            />
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
            {monthlyExpense.expenses.length} expenses
          </Typography>
          <IconButton
            onClick={e => {
              e.stopPropagation();
              toggleExpand();
            }}
          >
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>
      {isExpanded && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <List disablePadding>
            {monthlyExpense.expenses.map(expense => (
              <ListItem key={expense.id} disableGutters>
                <ExpenseViewContainer expense={expense} refresh={refresh} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
}
