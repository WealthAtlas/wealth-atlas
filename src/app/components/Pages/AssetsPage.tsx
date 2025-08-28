import { Asset } from '@/domain/entities/assets/Asset';
import { Add } from '@mui/icons-material';
import { Box, Button, CircularProgress, Fab, Grid, Paper, Typography } from '@mui/material';
import React from 'react';
import { AssetFormContainer } from '../../containers/assets/AssetFormContainer';
import { AssetViewContainer } from '../../containers/assets/AssetViewContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface AssetsPageProps {
  assets: Asset[];
  isLoading: boolean;
  refresh: () => void;
}

export function AssetsPage({ assets, isLoading, refresh }: AssetsPageProps) {
  const [showAddAsset, setShowAddAsset] = React.useState(false);

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
    <>
      <AssetFormContainer
        assetToEdit={undefined}
        onClose={() => setShowAddAsset(false)}
        open={showAddAsset}
        onSuccess={() => {
          setShowAddAsset(false);
          refresh();
        }}
      />
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
                <Typography variant="h6">{UIUtils.formatCurrency(0, 'USD')}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Invested
                </Typography>
                <Typography variant="h6">{UIUtils.formatCurrency(0, 'USD')}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total P&L
                </Typography>
                <Typography variant="h6" color={'success.main'}>
                  {UIUtils.formatCurrency(0, 'USD')}({UIUtils.formatPercentage(0)})
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {assets.map(asset => (
            <AssetViewContainer key={asset.id} asset={asset} refresh={refresh} />
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
            <Button variant="contained" startIcon={<Add />} onClick={() => setShowAddAsset(true)}>
              Add Your First Asset
            </Button>
          </Paper>
        )}

        <Fab
          color="primary"
          aria-label="add asset"
          onClick={() => setShowAddAsset(true)}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
          }}
        >
          <Add />
        </Fab>
      </Box>
    </>
  );
}
