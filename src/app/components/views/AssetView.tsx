import { InvestmentListDialog } from '@/app/components/dialogs/InvestmentListDialog';
import { AssetFormContainer } from '@/app/containers/assets/AssetFormContainer';
import { UIUtils } from '@/app/utils/UIUtils';
import { Asset } from '@/domain/entities/assets/Asset';
import { ValueModel } from '@/domain/entities/assets/ValueModel';
import { Delete, Edit, List, TrendingDown, TrendingFlat, TrendingUp } from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';

export interface AssetViewProps {
  asset: Asset;
  deleteAsset: (id: number) => void;
  deleteInvestment: (id: number) => void;
  refresh: () => void;
}

export function AssetView({ asset, deleteAsset, deleteInvestment, refresh }: AssetViewProps) {
  const [showViewTransactions, setShowViewTransactions] = useState<boolean>(false);
  const [showEditAsset, setShowEditAsset] = useState<boolean>(false);

  // Calculate financial metrics
  const totalInvested = asset.getTotalInvestedAmount();
  const currentValue = asset.getValue() || 0;
  const currentHoldings = asset.getCurrentHoldings();
  const profitLoss = asset.getProfitLoss() || 0;
  const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  const irr = asset.getIRR(new Date());

  // Color coding for profit/loss
  const getProfitLossColor = () => {
    if (profitLoss > 0) return 'success.main';
    if (profitLoss < 0) return 'error.main';
    return 'text.secondary';
  };

  const getTrendIcon = () => {
    if (profitLoss > 0) return <TrendingUp fontSize="small" sx={{ color: 'success.main' }} />;
    if (profitLoss < 0) return <TrendingDown fontSize="small" sx={{ color: 'error.main' }} />;
    return <TrendingFlat fontSize="small" sx={{ color: 'text.secondary' }} />;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getValueModelDescription = () => {
    switch (asset.valueModel) {
      case ValueModel.MARKET_BASED:
        return 'Market Value';
      case ValueModel.FIXED_INCOME:
        return 'Fixed Income';
      case ValueModel.MATURITY_BASED:
        return 'Maturity Based';
      default:
        return 'Unknown';
    }
  };

  return (
    <>
      <InvestmentListDialog
        open={showViewTransactions}
        asset={asset}
        investments={asset.getTransactions(new Date(), false)}
        deleteInvestment={deleteInvestment}
        onClose={() => setShowViewTransactions(false)}
        refresh={refresh}
      />
      <AssetFormContainer
        assetToEdit={asset}
        onClose={() => setShowEditAsset(false)}
        open={showEditAsset}
        onSuccess={() => {
          setShowEditAsset(false);
          refresh();
        }}
      />
      <Grid item xs={12} md={6} key={asset.id}>
        <Card
          elevation={3}
          sx={{
            height: '100%',
            transition: 'all 0.3s ease',
            '&:hover': {
              elevation: 6,
              transform: 'translateY(-2px)',
            },
          }}
        >
          <CardContent sx={{ p: 3 }}>
            {/* Header Section */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" component="div" sx={{ fontWeight: 600, mb: 1 }}>
                  {asset.name}
                </Typography>
                <Box
                  sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <Chip label={asset.category} size="small" variant="outlined" color="primary" />
                  <Chip
                    label={getValueModelDescription()}
                    size="small"
                    variant="filled"
                    sx={{ bgcolor: 'grey.100', color: 'text.secondary' }}
                  />
                  {asset.currency && (
                    <Chip
                      label={asset.currency}
                      size="small"
                      variant="outlined"
                      sx={{ borderColor: 'grey.300' }}
                    />
                  )}
                </Box>
                {asset.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1, lineHeight: 1.4 }}
                  >
                    {asset.description}
                  </Typography>
                )}
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
                <Tooltip title="View Transactions">
                  <IconButton
                    size="small"
                    onClick={() => setShowViewTransactions(true)}
                    aria-label="view transactions"
                    sx={{ bgcolor: 'action.hover' }}
                  >
                    <List fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Edit Asset">
                  <IconButton
                    size="small"
                    onClick={() => setShowEditAsset(true)}
                    aria-label="edit asset"
                    sx={{ bgcolor: 'action.hover' }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Asset">
                  <IconButton
                    size="small"
                    onClick={() => deleteAsset(asset.id!)}
                    aria-label="delete asset"
                    sx={{
                      bgcolor: 'action.hover',
                      '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Financial Metrics Section */}
            <Box sx={{ mt: 2 }}>
              {/* Current Value & Performance */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
                    {UIUtils.formatCurrency(currentValue, asset.currency)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getTrendIcon()}
                    <Typography
                      variant="h6"
                      sx={{
                        color: getProfitLossColor(),
                        fontWeight: 600,
                      }}
                    >
                      {formatPercentage(profitLossPercentage)}
                    </Typography>
                  </Box>
                </Box>

                <Typography
                  variant="body1"
                  sx={{
                    color: getProfitLossColor(),
                    fontWeight: 500,
                  }}
                >
                  {profitLoss >= 0 ? '+' : ''}
                  {UIUtils.formatCurrency(profitLoss, asset.currency)}
                </Typography>
              </Box>

              {/* Investment Summary */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Total Invested
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {UIUtils.formatCurrency(totalInvested, asset.currency)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Holdings
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {currentHoldings.toLocaleString()}
                      {asset.valueModel === ValueModel.MARKET_BASED && ' units'}
                    </Typography>
                  </Box>
                </Grid>

                {/* IRR Display */}
                {irr && (
                  <Grid item xs={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        IRR (Annual)
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: irr > 0 ? 'success.main' : irr < 0 ? 'error.main' : 'text.primary',
                        }}
                      >
                        {formatPercentage(irr)}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {/* Additional Info based on Value Model */}
                {asset.valueModel === ValueModel.FIXED_INCOME && asset.interestRate && (
                  <Grid item xs={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Interest Rate
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {asset.interestRate}%
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {asset.maturityDate && (
                  <Grid item xs={12}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Maturity Date
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {asset.maturityDate.toLocaleDateString()}
                        {asset.maturityAmount && (
                          <span style={{ color: 'text.secondary', marginLeft: 8 }}>
                            • {UIUtils.formatCurrency(asset.maturityAmount, asset.currency)}
                          </span>
                        )}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {/* Market Value Info */}
                {asset.valueModel === ValueModel.MARKET_BASED && asset.marketValueUpdatedAt && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Market value as of {asset.marketValueUpdatedAt.toLocaleDateString()}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </>
  );
}
