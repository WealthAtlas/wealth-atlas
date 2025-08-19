import { EXPENSE_CATEGORY_LABELS } from '@/domain/entities/expenses/ExpenseCategory';
import { ScheduledExpense } from '@/domain/entities/expenses/ScheduledExpense';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import React from 'react';

interface ScheduledExpenseListDialogProps {
  open: boolean;
  onClose: () => void;
  scheduledExpenses: ScheduledExpense[];
  onAdd: () => void;
  onEdit: (scheduledExpense: ScheduledExpense) => void;
  onDelete: (scheduledExpense: ScheduledExpense) => void;
  loading?: boolean;
}

export function ScheduledExpenseListDialog({
  open,
  onClose,
  scheduledExpenses,
  onAdd,
  onEdit,
  onDelete,
  loading = false,
}: ScheduledExpenseListDialogProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (scheduledExpense: ScheduledExpense) => {
    if (!scheduledExpense.isActive()) {
      return 'default';
    }
    return 'success';
  };

  const getStatusLabel = (scheduledExpense: ScheduledExpense) => {
    if (!scheduledExpense.isActive()) {
      return 'Inactive';
    }
    return 'Active';
  };

  const getNextExpenseInfo = (scheduledExpense: ScheduledExpense) => {
    const nextDate = scheduledExpense.getNextExpenseDate();
    if (!nextDate) {
      return 'No more expenses';
    }
    return `Next: ${formatDate(nextDate)}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon />
          Scheduled Expenses
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Loading scheduled expenses...</Typography>
          </Box>
        ) : scheduledExpenses.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <ScheduleIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              No Scheduled Expenses
            </Typography>
            <Typography variant="body2">
              Create recurring expenses like rent, subscriptions, or daily commute costs.
            </Typography>
          </Box>
        ) : (
          <List>
            {scheduledExpenses.map((scheduledExpense, index) => (
              <React.Fragment key={scheduledExpense.id || index}>
                <ListItem
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    py: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', mb: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="h6">{scheduledExpense.name}</Typography>
                          <Chip
                            label={getStatusLabel(scheduledExpense)}
                            color={getStatusColor(scheduledExpense)}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="h6" color="primary" gutterBottom>
                            {scheduledExpense.getFormattedAmount()}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            <Chip
                              label={EXPENSE_CATEGORY_LABELS[scheduledExpense.category]}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={scheduledExpense.frequency}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                            <Chip
                              label={scheduledExpense.isEssential ? 'Essential' : 'Non-Essential'}
                              color={scheduledExpense.isEssential ? 'success' : 'warning'}
                              size="small"
                            />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Start:</strong> {formatDate(scheduledExpense.startDate)}
                            </Typography>
                            {scheduledExpense.endDate && (
                              <Typography variant="body2" color="text.secondary">
                                <strong>End:</strong> {formatDate(scheduledExpense.endDate)}
                              </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary">
                              {getNextExpenseInfo(scheduledExpense)}
                            </Typography>
                          </Box>
                          {scheduledExpense.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {scheduledExpense.description}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => onEdit(scheduledExpense)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => onDelete(scheduledExpense)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </ListItem>
                {index < scheduledExpenses.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Add Scheduled Expense FAB */}
      <Fab
        color="primary"
        aria-label="add scheduled expense"
        onClick={onAdd}
        size="medium"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
        }}
      >
        <AddIcon />
      </Fab>
    </Dialog>
  );
}
