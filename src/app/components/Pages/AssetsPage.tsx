import { Asset } from '@/domain/entities/assets/Asset';
import { Add, Delete, Edit, List, Schedule } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Fab,
  Grid,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';

export interface AssetsPageProps {
  assets: Asset[];
  isLoading: boolean;
  onAddAsset: () => void;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
  onViewTransactions: (asset: Asset) => void;
  onManageSIP: (asset: Asset) => void;
}

export function AssetsPage({
  assets,
  isLoading,
  onAddAsset,
  onEditAsset,
  onDeleteAsset,
  onViewTransactions,
  onManageSIP,
}: AssetsPageProps) {
  const formatCurrency = (amount: number | undefined, currency: string): string => {
    if (amount === undefined) return 'N/A';

    const currencySymbols: Record<string, string> = {
      USD: '$',
      INR: '₹',
      GBP: '£',
    };

    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const formatPercentage = (percentage: number | undefined): string => {
    if (percentage === undefined) return 'N/A';
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 200px)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, pb: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Assets
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Value
              </Typography>
              <Typography variant="h6">{formatCurrency(0, 'USD')}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Invested
              </Typography>
              <Typography variant="h6">{formatCurrency(0, 'USD')}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total P&L
              </Typography>
              <Typography variant="h6" color={'success.main'}>
                {formatCurrency(0, 'USD')}({formatPercentage(0)})
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {assets.map(asset => (
          <Grid item xs={12} md={6} key={asset.id}>
            <Card elevation={2}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    mb: 2,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6" component="div" sx={{ flex: 1 }}>
                        {asset.name}
                      </Typography>
                      <Tooltip title="View Transactions">
                        <IconButton
                          size="small"
                          onClick={() => onViewTransactions(asset)}
                          aria-label="view transactions"
                        >
                          <List fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Manage SIP">
                        <IconButton
                          size="small"
                          onClick={() => onManageSIP(asset)}
                          aria-label="manage SIP"
                        >
                          <Schedule fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Asset">
                        <IconButton
                          size="small"
                          onClick={() => onEditAsset(asset)}
                          aria-label="edit asset"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Asset">
                        <IconButton
                          size="small"
                          onClick={() => onDeleteAsset(asset)}
                          aria-label="delete asset"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                      <Chip label={asset.category} size="small" variant="outlined" />
                    </Box>
                    {asset.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {asset.description}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ textAlign: 'right', ml: 2 }}>
                    <Typography variant="h5" component="div">
                      {formatCurrency(0, asset.currency)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {asset.currency}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {assets.length === 0 && (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            No assets found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Start building your wealth by adding your first asset.
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={onAddAsset}>
            Add Your First Asset
          </Button>
        </Paper>
      )}

      <Fab
        color="primary"
        aria-label="add asset"
        onClick={onAddAsset}
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 16,
        }}
      >
        <Add />
      </Fab>
    </Box>
  );
}
