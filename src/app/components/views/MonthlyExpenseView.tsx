import { ExpandLess, ExpandMore } from '@mui/icons-material';
import {
  Box,
  Collapse,
  IconButton,
  List,
  ListItem,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { MonthlyExpense } from '../../../domain/entities/expenses/MonthlyExpense';
import { ExpenseViewContainer } from '../../containers/expense/ExpenseViewContainer';

export interface MonthlyExpenseViewProps {
  monthlyExpense: MonthlyExpense;
  refresh: () => void;
}

export function MonthlyExpenseView({ monthlyExpense, refresh }: MonthlyExpenseViewProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <>
      <TableRow>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton size="small" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
            <Typography variant="body1" sx={{ ml: 1 }}>
              {monthlyExpense.month}
            </Typography>
          </Box>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight="bold">
            {monthlyExpense.getTotalExpenses().toLocaleString()}
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={2} sx={{ p: 0 }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List disablePadding>
              {monthlyExpense.expenses.map(expense => (
                <ListItem key={expense.id} disableGutters>
                  <ExpenseViewContainer expense={expense} refresh={refresh} />
                </ListItem>
              ))}
            </List>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
