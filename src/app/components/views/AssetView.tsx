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

  // Determine if this asset has tradeable units/holdings
  const hasHoldings = currentHoldings !== undefined && currentHoldings > 0;

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
      <Grid item xs={12} lg={6} key={asset.id}>
        <Card
          elevation={2}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '1px solid',
            borderColor: 'grey.200',
            '&:hover': {
              elevation: 4,
              transform: 'translateY(-4px)',
              borderColor: 'primary.300',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
            },
          }}
        >
          <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header Section */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 2,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h5"
                  component="div"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    wordBreak: 'break-word',
                  }}
                >
                  {asset.name}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    mb: 1,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <Chip label={asset.category} size="small" variant="outlined" color="primary" />
                  <Chip
                    label={getValueModelDescription()}
                    size="small"
                    variant="filled"
                    sx={{
                      bgcolor: 'primary.50',
                      color: 'primary.700',
                      fontWeight: 500,
                    }}
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
                    sx={{
                      mt: 1,
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {asset.description}
                  </Typography>
                )}
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 2 }}>
                <Tooltip title="View Transactions" placement="left">
                  <IconButton
                    size="small"
                    onClick={() => setShowViewTransactions(true)}
                    aria-label="view transactions"
                    sx={{
                      bgcolor: 'action.hover',
                      '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' },
                    }}
                  >
                    <List fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Edit Asset" placement="left">
                  <IconButton
                    size="small"
                    onClick={() => setShowEditAsset(true)}
                    aria-label="edit asset"
                    sx={{
                      bgcolor: 'action.hover',
                      '&:hover': { bgcolor: 'warning.light', color: 'warning.contrastText' },
                    }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Asset" placement="left">
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
              {/* Current Value & Performance - Enhanced Layout */}
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1,
                    flexWrap: 'wrap',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Current Value
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
                      {UIUtils.formatCurrency(currentValue, asset.currency)}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Performance
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        justifyContent: 'flex-end',
                      }}
                    >
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
                    <Typography
                      variant="body1"
                      sx={{
                        color: getProfitLossColor(),
                        fontWeight: 500,
                        mt: 0.5,
                      }}
                    >
                      {profitLoss >= 0 ? '+' : ''}
                      {UIUtils.formatCurrency(profitLoss, asset.currency)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Investment Summary */}
              <Grid container spacing={2}>
                <Grid item xs={hasHoldings ? 6 : 12}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Total Invested
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {UIUtils.formatCurrency(totalInvested, asset.currency)}
                    </Typography>
                  </Box>
                </Grid>

                {/* Only show holdings if they exist */}
                {hasHoldings && (
                  <Grid item xs={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Holdings
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {currentHoldings!.toLocaleString()}
                        {asset.valueModel === ValueModel.MARKET_BASED && ' units'}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {/* IRR Display */}
                {irr !== undefined && (
                  <Grid item xs={6} sm={hasHoldings ? 4 : 6}>
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
                  <Grid item xs={6} sm={hasHoldings ? 4 : 6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Interest Rate
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {asset.interestRate}% p.a.
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {asset.maturityDate && (
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'info.50',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'info.200',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Maturity Information
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {asset.maturityDate.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                        {asset.maturityAmount && (
                          <Typography
                            component="span"
                            variant="body1"
                            sx={{
                              color: 'success.main',
                              marginLeft: 2,
                              fontWeight: 600,
                            }}
                          >
                            • {UIUtils.formatCurrency(asset.maturityAmount, asset.currency)}
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {/* Market Value Info */}
                {asset.valueModel === ValueModel.MARKET_BASED && asset.marketValueUpdatedAt && (
                  <Grid item xs={12}>
                    <Box sx={{ textAlign: 'center', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Market value updated on{' '}
                        {asset.marketValueUpdatedAt.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Typography>
                    </Box>
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
