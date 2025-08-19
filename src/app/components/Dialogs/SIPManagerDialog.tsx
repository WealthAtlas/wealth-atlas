import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
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
import React, { useEffect, useState } from 'react';
import { AssetTransactionRepository } from '../../../data/repositories/AssetTransactionRepository';
import { ScheduledAssetTransactionRepository } from '../../../data/repositories/ScheduledAssetTransactionRepository';
import { Asset } from '../../../domain/entities/assets/Asset';
import { INVESTMENT_FREQUENCY_LABELS } from '../../../domain/entities/assets/InvestmentFrequency';
import { ScheduledAssetTransaction } from '../../../domain/entities/assets/ScheduledAssetTransaction';
import {
  InvestmentScheduleService,
  SIPSummary,
} from '../../../domain/services/InvestmentScheduleService';
import { SIPFormDialog } from '../Forms/SIPFormDialog';

interface SIPManagerDialogProps {
  open: boolean;
  onClose: () => void;
  asset: Asset | null;
}

export const SIPManagerDialog: React.FC<SIPManagerDialogProps> = ({ open, onClose, asset }) => {
  const [sipDialogOpen, setSipDialogOpen] = useState(false);
  const [sipSummaries, setSipSummaries] = useState<SIPSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSIP, setEditingSIP] = useState<ScheduledAssetTransaction | null>(null);

  const scheduledTransactionRepository = new ScheduledAssetTransactionRepository();
  const assetTransactionRepository = new AssetTransactionRepository();
  const investmentService = new InvestmentScheduleService(
    scheduledTransactionRepository,
    assetTransactionRepository
  );

  useEffect(() => {
    if (asset && open) {
      loadSIPSummaries();
    }
  }, [asset, open]);

  const loadSIPSummaries = async () => {
    if (!asset?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Auto-convert any due transactions first
      await investmentService.autoConvertScheduledTransactions();

      // Then load summaries
      const summaries = await investmentService.getSIPSummariesByAsset(asset.id);
      setSipSummaries(summaries);
    } catch (err) {
      setError('Failed to load SIP data');
      console.error('Error loading SIP summaries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSIP = async (scheduledTransaction: Partial<ScheduledAssetTransaction>) => {
    try {
      setError(null);
      const fullTransaction = scheduledTransaction as ScheduledAssetTransaction;

      if (editingSIP) {
        // Update existing SIP
        const updatedTransaction = new ScheduledAssetTransaction(
          editingSIP.id,
          fullTransaction.assetId,
          fullTransaction.transactionType,
          fullTransaction.quantity,
          fullTransaction.price,
          fullTransaction.scheduledDate,
          fullTransaction.frequency,
          fullTransaction.endDate,
          fullTransaction.totalOccurrences,
          fullTransaction.isActive,
          editingSIP.isExecuted,
          editingSIP.executedTransactionId
        );
        await investmentService.updateSIP(updatedTransaction);
      } else {
        // Create new SIP
        await investmentService.createSIP(fullTransaction);
      }

      await loadSIPSummaries();
      setEditingSIP(null);
    } catch (err) {
      setError(editingSIP ? 'Failed to update SIP' : 'Failed to create SIP');
      console.error('Error managing SIP:', err);
    }
  };

  const handleEditSIP = (summary: SIPSummary) => {
    setEditingSIP(summary.scheduled);
    setSipDialogOpen(true);
  };

  const handleToggleActive = async (summary: SIPSummary) => {
    try {
      setError(null);
      const updated = new ScheduledAssetTransaction(
        summary.scheduled.id,
        summary.scheduled.assetId,
        summary.scheduled.transactionType,
        summary.scheduled.quantity,
        summary.scheduled.price,
        summary.scheduled.scheduledDate,
        summary.scheduled.frequency,
        summary.scheduled.endDate,
        summary.scheduled.totalOccurrences,
        !summary.scheduled.isActive, // Toggle active status
        summary.scheduled.isExecuted,
        summary.scheduled.executedTransactionId
      );
      await investmentService.updateSIP(updated);
      await loadSIPSummaries();
    } catch (err) {
      setError('Failed to update SIP status');
      console.error('Error updating SIP:', err);
    }
  };

  const handleDeleteSIP = async (summary: SIPSummary) => {
    if (
      !confirm(
        'Are you sure you want to delete this SIP? You can choose to keep existing transactions.'
      )
    ) {
      return;
    }

    const keepTransactions = confirm('Keep existing transactions created by this SIP?');

    try {
      setError(null);
      await investmentService.deleteSIP(summary.scheduled.id!, keepTransactions);
      await loadSIPSummaries();
    } catch (err) {
      setError('Failed to delete SIP');
      console.error('Error deleting SIP:', err);
    }
  };

  const getDueSummaries = () => {
    return sipSummaries.filter(
      s =>
        s.nextInvestmentDate &&
        s.nextInvestmentDate <= new Date() &&
        s.scheduled.isActive &&
        !s.isCompleted
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const dueSummaries = getDueSummaries();

  if (!asset) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>SIP Manager - {asset.name}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {dueSummaries.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Due Investments ({dueSummaries.length})
              </Typography>
              <Alert severity="info">
                You have {dueSummaries.length} investment(s) due for execution.
              </Alert>
            </Box>
          )}

          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6">Scheduled Investments</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingSIP(null);
                setSipDialogOpen(true);
              }}
            >
              Create SIP
            </Button>
          </Box>

          {loading ? (
            <Typography>Loading SIP data...</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Amount</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Next Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sipSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No SIPs configured. Click "Create SIP" to get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sipSummaries.map(summary => (
                      <TableRow key={summary.scheduled.id}>
                        <TableCell>{formatCurrency(summary.scheduled.getTotalAmount())}</TableCell>
                        <TableCell>
                          {INVESTMENT_FREQUENCY_LABELS[summary.scheduled.frequency]}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatCurrency(summary.totalInvested)}
                            {summary.expectedTotalInvestment > 0 && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                of {formatCurrency(summary.expectedTotalInvestment)} expected
                              </Typography>
                            )}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDate(summary.nextInvestmentDate)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              size="small"
                              label={summary.scheduled.isActive ? 'Active' : 'Paused'}
                              color={summary.scheduled.isActive ? 'success' : 'default'}
                            />
                            {summary.isCompleted && (
                              <Chip size="small" label="Completed" color="info" />
                            )}
                            {summary.nextInvestmentDate &&
                              summary.nextInvestmentDate <= new Date() &&
                              summary.scheduled.isActive && (
                                <Chip size="small" label="Due" color="warning" />
                              )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleEditSIP(summary)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleActive(summary)}
                              color={summary.scheduled.isActive ? 'warning' : 'success'}
                            >
                              {summary.scheduled.isActive ? <PauseIcon /> : <PlayIcon />}
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteSIP(summary)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {asset && (
        <SIPFormDialog
          open={sipDialogOpen}
          onClose={() => {
            setSipDialogOpen(false);
            setEditingSIP(null);
          }}
          onSubmit={handleCreateSIP}
          assetId={asset.id!}
          assetName={asset.name}
          editingSIP={editingSIP}
        />
      )}
    </>
  );
};
