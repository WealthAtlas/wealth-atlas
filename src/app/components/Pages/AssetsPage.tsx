import { Asset } from '@/domain/entities/assets/Asset';
import { Add, Edit, List, TrendingUp } from '@mui/icons-material';
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
  onAddTransaction: (asset: Asset) => void;
  onViewTransactions: (asset: Asset) => void;
}

export function AssetsPage({
  assets,
  isLoading,
  onAddAsset,
  onEditAsset,
  onAddTransaction,
  onViewTransactions,
}: AssetsPageProps) {
  const formatCurrency = (amount: number | undefined, currency: string): string => {
    if (amount === undefined) return 'N/A';

    // Simple currency formatting - could be enhanced with proper locale support
    const currencySymbols: Record<string, string> = {
      USD: '$',
      INR: '₹',
      GBP: '£',
    };

    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  // Calculate total value of all assets
  const totalValue = assets.reduce((sum, asset) => {
    return sum + (asset.currentMarketValue || 0);
  }, 0);

  const formattedTotalValue =
    assets.length > 0
      ? formatCurrency(totalValue, 'USD') // Assuming USD for total - could be enhanced
      : '$0';

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
          <Typography variant="h6" color="text.secondary">
            Total Value: {formattedTotalValue}
          </Typography>
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
                      <Tooltip title="Add Transaction">
                        <IconButton
                          size="small"
                          onClick={() => onAddTransaction(asset)}
                          aria-label="add transaction"
                        >
                          <TrendingUp fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Transactions">
                        <IconButton
                          size="small"
                          onClick={() => onViewTransactions(asset)}
                          aria-label="view transactions"
                        >
                          <List fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={() => onEditAsset(asset)}
                        aria-label="edit asset"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Box>
                    <Chip label={asset.category} size="small" variant="outlined" sx={{ mb: 1 }} />
                    {asset.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {asset.description}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ textAlign: 'right', ml: 2 }}>
                    <Typography variant="h5" component="div">
                      {formatCurrency(asset.currentMarketValue, asset.currency)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {asset.currency}
                    </Typography>
                    {asset.valueUpdatedAt && (
                      <Typography variant="caption" color="text.secondary">
                        Updated: {asset.valueUpdatedAt.toLocaleDateString()}
                      </Typography>
                    )}
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

      {/* Floating Action Button */}
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
