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
import { IAsset } from '../../../domain/entities/assets/Asset';
import { SIP } from '../../../domain/entities/assets/SIP';
import { Frequency } from '../../../domain/entities/shared/Frequency';
import { SIPFormContainer } from '../../containers/assets/sip/SIPFormContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface SIPViewProps {
  asset: IAsset;
  sip: SIP;
  showTransactionEdit: boolean;
  setShowTransactionEdit: (show: boolean) => void;
  deleteSIP: (id: number) => void;
  refresh: () => void;
}

export function SIPView({
  asset,
  sip,
  showTransactionEdit,
  setShowTransactionEdit,
  deleteSIP,
  refresh,
}: SIPViewProps) {
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

  // Calculate if SIP is active
  const isActive = (): boolean => {
    const now = new Date();
    const startDate = new Date(sip.startDate);
    const endDate = sip.endDate ? new Date(sip.endDate) : null;
    return startDate <= now && (!endDate || now <= endDate);
  };

  // Calculate SIP amount
  const calculateAmount = (): number => {
    return (sip.quantity || 0) * sip.price;
  };

  const nextPayment = sip.getNextOccurenceDate();
  const active = isActive();

  return (
    <>
      {showTransactionEdit && (
        <SIPFormContainer
          open={showTransactionEdit}
          asset={asset}
          sipToEdit={sip}
          onClose={() => {
            setShowTransactionEdit(false);
            refresh();
          }}
        />
      )}
      <TableRow key={sip.id} sx={{ '&:hover': { backgroundColor: 'grey.50' } }}>
        {/* SIP Name & Status */}
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Schedule fontSize="small" color="primary" />
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                SIP #{sip.id}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                size="small"
                label={active ? 'Active' : 'Inactive'}
                color={active ? 'success' : 'default'}
                variant="outlined"
              />
              <Chip
                size="small"
                label={formatFrequency(sip.frequency)}
                color={getFrequencyColor(sip.frequency)}
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
                {new Date(sip.startDate).toLocaleDateString()}
              </Typography>
            </Box>
            {sip.endDate && (
              <Typography variant="caption" color="text.secondary">
                Until {new Date(sip.endDate).toLocaleDateString()}
              </Typography>
            )}
            {active && (
              <Typography variant="caption" color="primary" sx={{ fontWeight: 'medium' }}>
                Next: {nextPayment.toLocaleDateString()}
              </Typography>
            )}
          </Stack>
        </TableCell>

        {/* SIP Amount */}
        <TableCell align="right">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
              {UIUtils.formatCurrency(calculateAmount(), asset.currency)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              per {formatFrequency(sip.frequency).toLowerCase()}
            </Typography>
          </Box>
        </TableCell>

        {/* Last Generated Info */}
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {sip.lastGeneratedDate ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Last generated:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {new Date(sip.lastGeneratedDate).toLocaleDateString()}
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
            <Tooltip title="Edit SIP Schedule">
              <IconButton
                size="small"
                onClick={() => setShowTransactionEdit(true)}
                aria-label="edit sip schedule"
                color="primary"
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete SIP Schedule">
              <IconButton
                size="small"
                onClick={() => deleteSIP(sip.id!)}
                aria-label="delete sip schedule"
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
