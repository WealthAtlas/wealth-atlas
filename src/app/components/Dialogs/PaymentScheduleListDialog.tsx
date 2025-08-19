import { Loan } from '@/domain/entities/loans/Loan';
import { PaymentSchedule } from '@/domain/entities/loans/PaymentSchedule';
import { Add, Delete, Edit, Schedule } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  Grid,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';

export interface PaymentScheduleListDialogProps {
  isOpen: boolean;
  loan: Loan;
  schedules: PaymentSchedule[];
  isLoading: boolean;
  onAddSchedule: () => void;
  onEditSchedule: (schedule: PaymentSchedule) => void;
  onDeleteSchedule: (scheduleId: number) => void;
  onClose: () => void;
}

export function PaymentScheduleListDialog({
  isOpen,
  loan,
  schedules,
  isLoading,
  onAddSchedule,
  onEditSchedule,
  onDeleteSchedule,
  onClose,
}: PaymentScheduleListDialogProps) {
  const formatCurrency = (amount: number): string => {
    // Use the loan's currency for formatting
    const currencySymbols: Record<string, string> = {
      USD: '$',
      INR: '₹',
      GBP: '£',
    };

    const symbol = currencySymbols[loan.currency] || loan.currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const formatDateRange = (startDate: Date, endDate: Date): string => {
    const start = startDate.toLocaleDateString();
    const end = endDate.toLocaleDateString();
    return `${start} - ${end}`;
  };

  const getStatusColor = (schedule: PaymentSchedule): 'primary' | 'success' | 'default' => {
    const today = new Date();
    if (today < schedule.startDate) return 'default'; // Not started
    if (today > schedule.endDate) return 'success'; // Completed
    return 'primary'; // Active
  };

  const getStatusLabel = (schedule: PaymentSchedule): string => {
    const today = new Date();
    if (today < schedule.startDate) return 'Not Started';
    if (today > schedule.endDate) return 'Completed';
    return 'Active';
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Payment Schedules for {loan.name}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: 200,
            }}
          >
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Schedule />
          Payment Schedules for {loan.name}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={2}>
          {schedules.map(schedule => (
            <Grid item xs={12} key={schedule.id}>
              <Card elevation={1}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" component="div">
                          {schedule.name}
                        </Typography>
                        <Chip
                          label={getStatusLabel(schedule)}
                          color={getStatusColor(schedule)}
                          size="small"
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {schedule.frequency} •{' '}
                        {formatDateRange(schedule.startDate, schedule.endDate)}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Total Scheduled: {formatCurrency(schedule.getTotalScheduledAmount())}
                        <br />
                        Payments: {schedule.getTotalPaymentCount()}
                      </Typography>

                      {schedule.lastGeneratedDate && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 1 }}
                        >
                          Last generated: {schedule.lastGeneratedDate.toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Typography variant="h5" component="div" sx={{ mb: 1 }}>
                        {formatCurrency(schedule.amount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                        per {schedule.frequency.toLowerCase()}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit Schedule">
                          <IconButton
                            size="small"
                            onClick={() => onEditSchedule(schedule)}
                            aria-label="edit schedule"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Schedule">
                          <IconButton
                            size="small"
                            onClick={() => schedule.id && onDeleteSchedule(schedule.id)}
                            aria-label="delete schedule"
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {schedules.length === 0 && (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
            <Schedule sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No payment schedules
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Create payment schedules to automate your loan payment tracking.
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={onAddSchedule}>
              Add First Schedule
            </Button>
          </Paper>
        )}

        {/* Floating Action Button for adding schedules */}
        {schedules.length > 0 && (
          <Fab
            color="primary"
            aria-label="add schedule"
            onClick={onAddSchedule}
            sx={{
              position: 'absolute',
              bottom: 80,
              right: 24,
            }}
          >
            <Add />
          </Fab>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
