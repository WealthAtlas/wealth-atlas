import { Add, Close } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { EMI } from '../../../domain/entities/loans/EMI';
import { ILoan } from '../../../domain/entities/loans/Loan';
import { EMIFormContainer } from '../../containers/loan/emi/EMIFormContainer';
import { EMIViewContainer } from '../../containers/loan/emi/EMIViewContainer';

export interface EMIListDialogProps {
  open: boolean;
  loan: ILoan;
  emis: EMI[];
  showAddTransaction: boolean;
  setShowAddTransaction: (show: boolean) => void;
  deleteEMI: (id: number) => void;
  refresh: () => void;
  onClose: () => void;
}

export function EMIListDialog({
  open,
  loan,
  emis,
  showAddTransaction,
  setShowAddTransaction,
  deleteEMI,
  refresh,
  onClose,
}: EMIListDialogProps) {
  return (
    <>
      {showAddTransaction && (
        <EMIFormContainer
          open={showAddTransaction}
          loan={loan}
          emiToEdit={undefined}
          onClose={() => {
            setShowAddTransaction(false);
            refresh();
          }}
        />
      )}
      <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">EMI Schedules - {loan.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddTransaction(true)}
                size="small"
              >
                Add EMI
              </Button>
              <IconButton onClick={onClose} size="small">
                <Close />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {emis.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom>
                No EMI schedules found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Start tracking your loan payments by adding your first EMI schedule.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddTransaction(true)}
              >
                Add First EMI
              </Button>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Active EMI Schedules ({emis.length})
              </Typography>

              {/* EMI Schedules Table */}
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>EMI Details</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Schedule</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        Amount
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {emis.map(emi => (
                      <EMIViewContainer
                        key={emi.id!}
                        loan={loan}
                        emiId={emi.id!}
                        deleteEMI={deleteEMI}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
