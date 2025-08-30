import { Delete, Edit, List, Schedule } from '@mui/icons-material';
import { Box, Card, CardContent, Chip, Grid, IconButton, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { Asset } from '../../../domain/entities/assets/Asset';
import { InvestmentListContainer } from '../../containers/assets/investment/InvestmentListContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface AssetViewProps {
  asset: Asset;
  deleteAsset: (id: number) => void;
  refresh: () => void;
}

export function AssetView({ asset, deleteAsset, refresh }: AssetViewProps) {
  const [showViewTransactions, setShowViewTransactions] = useState<boolean>(false);

  return (
    <>
      <InvestmentListContainer
        open={showViewTransactions}
        onClose={() => setShowViewTransactions(false)}
        asset={asset}
        refresh={refresh}
      />
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
                      onClick={() => setShowViewTransactions(true)}
                      aria-label="view transactions"
                    >
                      <List fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="View SIPs">
                    <IconButton size="small" onClick={() => {}} aria-label="view SIPs">
                      <Schedule fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Asset">
                    <IconButton size="small" onClick={() => {}} aria-label="edit asset">
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Asset">
                    <IconButton
                      size="small"
                      onClick={() => deleteAsset(asset.id!)}
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
                  {UIUtils.formatCurrency(0, asset.currency)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {asset.currency}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </>
  );
}
