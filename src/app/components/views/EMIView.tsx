import { CalendarToday, Delete, Edit, EventRepeat, Schedule } from '@mui/icons-material';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { EMI } from '../../../domain/entities/loans/EMI';
import { ILoan } from '../../../domain/entities/loans/Loan';
import { Frequency } from '../../../domain/entities/shared/Frequency';
import { EMIFormContainer } from '../../containers/loan/emi/EMIFormContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface EMIViewProps {
  loan: ILoan;
  emi: EMI;
  showTransactionEdit: boolean;
  setShowTransactionEdit: (show: boolean) => void;
  deleteEMI: (id: number) => void;
  refresh: () => void;
}

export function EMIView({
  loan,
  emi,
  showTransactionEdit,
  setShowTransactionEdit,
  deleteEMI,
  refresh,
}: EMIViewProps) {
  // Helper function to format frequency for display
  const formatFrequency = (frequency: Frequency): string => {
    return frequency.charAt(0) + frequency.slice(1).toLowerCase().replace('_', ' ');
  };

  // Helper function to get frequency color
  const getFrequencyColor = (
    frequency: Frequency
  ): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (frequency) {
      case Frequency.MONTHLY:
        return 'primary';
      case Frequency.QUARTERLY:
        return 'info';
      case Frequency.ANNUALLY:
        return 'success';
      case Frequency.WEEKLY:
      case Frequency.BIWEEKLY:
        return 'warning';
      default:
        return 'default';
    }
  };

  // Calculate next payment date
  const getNextPaymentDate = (): Date => {
    return emi.getNextOccurenceDate();
  };

  // Check if EMI is active
  const isActiveEMI = (): boolean => {
    const now = new Date();
    const startDate = new Date(emi.startDate);
    const endDate = emi.endDate ? new Date(emi.endDate) : null;

    return startDate <= now && (!endDate || now <= endDate);
  };

  const nextPayment = getNextPaymentDate();
  const isActive = isActiveEMI();

  return (
    <>
      {showTransactionEdit && (
        <EMIFormContainer
          open={showTransactionEdit}
          loan={loan}
          emiToEdit={emi}
          onClose={() => {
            setShowTransactionEdit(false);
            refresh();
          }}
        />
      )}
      <TableRow key={emi.id} sx={{ '&:hover': { backgroundColor: 'grey.50' } }}>
        {/* EMI Name & Status */}
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Schedule fontSize="small" color="primary" />
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {emi.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                size="small"
                label={isActive ? 'Active' : 'Inactive'}
                color={isActive ? 'success' : 'default'}
                variant="outlined"
              />
              <Chip
                size="small"
                label={formatFrequency(emi.frequency)}
                color={getFrequencyColor(emi.frequency)}
                variant="outlined"
                icon={<EventRepeat fontSize="small" />}
              />
            </Box>
          </Box>
        </TableCell>

        {/* Schedule Dates */}
        <TableCell>
          <Stack spacing={0.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarToday fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {new Date(emi.startDate).toLocaleDateString()}
              </Typography>
            </Box>
            {emi.endDate && (
              <Typography variant="caption" color="text.secondary">
                Until {new Date(emi.endDate).toLocaleDateString()}
              </Typography>
            )}
            {isActive && (
              <Typography variant="caption" color="primary" sx={{ fontWeight: 'medium' }}>
                Next: {nextPayment.toLocaleDateString()}
              </Typography>
            )}
          </Stack>
        </TableCell>

        {/* EMI Amount */}
        <TableCell align="right">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
              {UIUtils.formatCurrency(emi.amount, loan.currency)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              per {formatFrequency(emi.frequency).toLowerCase()}
            </Typography>
          </Box>
        </TableCell>

        {/* Last Generated Info */}
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {emi.lastGeneratedDate ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Last generated:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {new Date(emi.lastGeneratedDate).toLocaleDateString()}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Not generated yet
              </Typography>
            )}
          </Box>
        </TableCell>

        {/* Actions */}
        <TableCell align="center">
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            <Tooltip title="Edit EMI Schedule">
              <IconButton
                size="small"
                onClick={() => setShowTransactionEdit(true)}
                aria-label="edit emi schedule"
                color="primary"
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete EMI Schedule">
              <IconButton
                size="small"
                onClick={() => deleteEMI(emi.id!)}
                aria-label="delete emi schedule"
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
