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
import { IAsset } from '../../../domain/entities/assets/Asset';
import { SIP } from '../../../domain/entities/assets/SIP';
import { SIPFormContainer } from '../../containers/assets/sip/SIPFormContainer';
import { SIPView } from '../views/SIPView';

export interface SIPListDialogProps {
  open: boolean;
  asset: IAsset;
  sips: SIP[];
  showAddTransaction: boolean;
  setShowAddTransaction: (show: boolean) => void;
  deleteSIP: (id: number) => void;
  refresh: () => void;
  onClose: () => void;
}

export function SIPListDialog({
  open,
  asset,
  sips,
  showAddTransaction,
  setShowAddTransaction,
  deleteSIP,
  refresh,
  onClose,
}: SIPListDialogProps) {
  return (
    <>
      {showAddTransaction && (
        <SIPFormContainer
          open={showAddTransaction}
          asset={asset}
          sipToEdit={undefined}
          onClose={() => {
            setShowAddTransaction(false);
            refresh();
          }}
        />
      )}
      <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">SIPs - {asset.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddTransaction(true)}
                size="small"
              >
                Add SIP
              </Button>
              <IconButton onClick={onClose} size="small">
                <Close />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {sips.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom>
                No SIPs found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Start tracking your investments by adding your first SIP.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddTransaction(true)}
              >
                Add First SIP
              </Button>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent SIPs
              </Typography>

              {/* Transactions Table */}
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Frequency</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Start Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>End Date</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        Amount
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sips.map(sip => (
                      <SIPView
                        key={sip.id!}
                        asset={asset}
                        sip={sip}
                        showTransactionEdit={false}
                        setShowTransactionEdit={() => {}}
                        deleteSIP={deleteSIP}
                        refresh={refresh}
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
