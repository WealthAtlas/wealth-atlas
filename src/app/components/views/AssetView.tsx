import { AssetFormContainer } from '@/app/containers/assets/AssetFormContainer';
import { UIUtils } from '@/app/utils/UIUtils';
import { Asset } from '@/domain/entities/assets/Asset';
import { ValueModel } from '@/domain/entities/assets/ValueModel';
import {
  AccountBalance,
  Delete,
  Edit,
  List,
  MoreVert,
  Repeat,
  Schedule,
  ShowChart,
  TrendingDown,
  TrendingFlat,
  TrendingUp,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { InvestmentListContainer } from '../../containers/assets/investment/InvestmentListContainer';
import { SIPListContainer } from '../../containers/assets/sip/SIPListContainer';

export interface AssetViewProps {
  asset: Asset;
  showViewTransactions: boolean;
  showEditAsset: boolean;
  showViewSIPs: boolean;
  setShowViewTransactions: (show: boolean) => void;
  setShowEditAsset: (show: boolean) => void;
  setShowViewSIPs: (show: boolean) => void;
  deleteAsset: (id: number) => void;
  refresh: () => void;
}

export function AssetView({
  asset,
  deleteAsset,
  refresh,
  showViewTransactions,
  showEditAsset,
  showViewSIPs,
  setShowViewTransactions,
  setShowEditAsset,
  setShowViewSIPs,
}: AssetViewProps) {
  const theme = useTheme();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Calculate financial metrics
  const totalInvested = asset.getTotalInvestedAmount();
  const currentValue = asset.getValue() || 0;
  const currentHoldings = asset.getCurrentHoldings();
  const profitLoss = asset.getProfitLoss() || 0;
  const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  const irr = asset.getIRR();

  // Determine if this asset has tradeable units/holdings
  const hasHoldings = currentHoldings !== undefined && currentHoldings > 0;

  // Performance status and colors
  const getPerformanceStatus = () => {
    if (profitLossPercentage > 10) return { status: 'Excellent', color: 'success.main' };
    if (profitLossPercentage > 0) return { status: 'Positive', color: 'success.main' };
    if (profitLossPercentage > -5) return { status: 'Neutral', color: 'warning.main' };
    return { status: 'Underperforming', color: 'error.main' };
  };

  const performanceStatus = getPerformanceStatus();

  const getTrendIcon = () => {
    if (profitLoss > 0) return <TrendingUp fontSize="small" />;
    if (profitLoss < 0) return <TrendingDown fontSize="small" />;
    return <TrendingFlat fontSize="small" />;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getValueModelIcon = () => {
    switch (asset.valueModel) {
      case ValueModel.MARKET_BASED:
        return <ShowChart />;
      case ValueModel.FIXED_INCOME:
        return <AccountBalance />;
      case ValueModel.MATURITY_BASED:
        return <Schedule />;
      default:
        return <AccountBalance />;
    }
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

  // Calculate progress for maturity-based assets
  const getMaturityProgress = () => {
    if (!asset.maturityDate) return null;
    const now = new Date();
    const start = asset.getInvestments(now, false)[0]?.date || now;
    const totalTime = asset.maturityDate.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const progress = Math.max(0, Math.min(100, (elapsed / totalTime) * 100));
    return progress;
  };

  const maturityProgress = getMaturityProgress();

  return (
    <>
      {/* Dialog Containers */}
      <InvestmentListContainer
        open={showViewTransactions}
        asset={asset}
        onClose={() => {
          setShowViewTransactions(false);
          refresh();
        }}
      />

      <SIPListContainer
        open={showViewSIPs}
        asset={asset}
        onClose={() => {
          setShowViewSIPs(false);
          refresh();
        }}
      />

      <AssetFormContainer
        assetToEdit={asset}
        onClose={() => {
          setShowEditAsset(false);
          refresh();
        }}
        open={showEditAsset}
      />

      <Grid item xs={12} lg={6}>
        <Card
          elevation={2}
          sx={{
            height: '100%',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '1px solid',
            borderColor: 'grey.200',
            overflow: 'hidden',
            '&:hover': {
              elevation: 6,
              transform: 'translateY(-2px)',
              borderColor: performanceStatus.color,
              boxShadow: `0 8px 25px ${alpha(
                performanceStatus.color.includes('success')
                  ? theme.palette.success.main
                  : performanceStatus.color.includes('warning')
                    ? theme.palette.warning.main
                    : theme.palette.error.main,
                0.2
              )}`,
            },
          }}
        >
          {/* Performance Header Band */}
          <Box
            sx={{
              bgcolor: performanceStatus.color,
              color: 'white',
              py: 1,
              px: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getTrendIcon()}
              <Typography variant="body2" fontWeight={600}>
                {performanceStatus.status}
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={600}>
              {formatPercentage(profitLossPercentage)}
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            {/* Asset Header */}
            <Box sx={{ mb: 3 }}>
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
                    variant="h6"
                    component="h3"
                    sx={{
                      fontWeight: 700,
                      mb: 1,
                      color: 'text.primary',
                      wordBreak: 'break-word',
                    }}
                  >
                    {asset.name}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip
                      icon={getValueModelIcon()}
                      label={getValueModelDescription()}
                      size="small"
                      variant="filled"
                      color="primary"
                      sx={{ fontWeight: 500 }}
                    />
                    <Chip
                      label={asset.category}
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                    {asset.currency && (
                      <Chip
                        label={asset.currency}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: 'grey.400' }}
                      />
                    )}
                  </Stack>

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

                {/* Action Menu */}
                <Box sx={{ ml: 2 }}>
                  <IconButton
                    size="small"
                    onClick={handleMenuClick}
                    sx={{
                      bgcolor: 'action.hover',
                      '&:hover': { bgcolor: 'action.selected' },
                    }}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                  <Menu
                    anchorEl={menuAnchorEl}
                    open={menuOpen}
                    onClose={handleMenuClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                  >
                    <MenuItem onClick={() => setShowEditAsset(true)}>
                      <Edit fontSize="small" sx={{ mr: 1 }} />
                      Edit Asset
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        deleteAsset(asset.id!);
                        handleMenuClose();
                      }}
                      sx={{ color: 'error.main' }}
                    >
                      <Delete fontSize="small" sx={{ mr: 1 }} />
                      Delete Asset
                    </MenuItem>
                  </Menu>
                </Box>
              </Box>
            </Box>

            {/* Financial Performance Section */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mb: 3,
                border: `1px solid ${alpha(
                  performanceStatus.color.includes('success')
                    ? theme.palette.success.main
                    : performanceStatus.color.includes('warning')
                      ? theme.palette.warning.main
                      : theme.palette.error.main,
                  0.2
                )}`,
                borderRadius: 2,
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Current Value
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    color="text.primary"
                    sx={{
                      wordBreak: 'break-word',
                      fontSize: { xs: '1.25rem', sm: '1.5rem' },
                    }}
                  >
                    {UIUtils.formatCurrency(currentValue, asset.currency)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Gain/Loss
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    sx={{
                      color: performanceStatus.color,
                      wordBreak: 'break-word',
                      fontSize: { xs: '1.125rem', sm: '1.25rem' },
                    }}
                  >
                    {profitLoss >= 0 ? '+' : ''}
                    {UIUtils.formatCurrency(profitLoss, asset.currency)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Key Metrics Grid */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Invested
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {UIUtils.formatCurrency(totalInvested, asset.currency)}
                  </Typography>
                </Box>
              </Grid>

              {hasHoldings && (
                <Grid item xs={6} sm={4}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Holdings
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {currentHoldings!.toLocaleString()}
                      {asset.valueModel === ValueModel.MARKET_BASED ? ' units' : ''}
                    </Typography>
                  </Box>
                </Grid>
              )}

              {irr !== undefined && (
                <Grid item xs={6} sm={4}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      IRR (Annual)
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight={600}
                      sx={{
                        color: irr > 0 ? 'success.main' : irr < 0 ? 'error.main' : 'text.primary',
                      }}
                    >
                      {formatPercentage(irr)}
                    </Typography>
                  </Box>
                </Grid>
              )}

              {/* Asset-specific metrics */}
              {asset.valueModel === ValueModel.FIXED_INCOME && asset.interestRate && (
                <Grid item xs={6} sm={4}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Interest Rate
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {asset.interestRate}% p.a.
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>

            {/* Maturity Information */}
            {asset.maturityDate && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: 'info.50',
                  border: '1px solid',
                  borderColor: 'info.200',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Maturity Information
                  </Typography>
                  {asset.maturityAmount && (
                    <Typography variant="body2" fontWeight={600} color="info.main">
                      {UIUtils.formatCurrency(asset.maturityAmount, asset.currency)}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                  {asset.maturityDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Typography>
                {maturityProgress !== null && (
                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={maturityProgress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: alpha(theme.palette.info.main, 0.2),
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          bgcolor: 'info.main',
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      {maturityProgress.toFixed(1)}% completed
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}

            {/* Action Buttons */}
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button
                variant="outlined"
                size="small"
                startIcon={<List />}
                onClick={() => setShowViewTransactions(true)}
                sx={{ flex: 1 }}
              >
                Investments
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Repeat />}
                onClick={() => setShowViewSIPs(true)}
                sx={{ flex: 1 }}
              >
                SIPs
              </Button>
            </Stack>

            {/* Market Value Update Info */}
            {asset.valueModel === ValueModel.MARKET_BASED && asset.getMarketValueDate() && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', mt: 2 }}
              >
                Market value updated on{' '}
                {asset.getMarketValueDate()!.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </>
  );
}
