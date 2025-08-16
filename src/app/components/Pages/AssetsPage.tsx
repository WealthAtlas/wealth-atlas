import { Add, TrendingDown, TrendingUp } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Chip, Fab, Grid, Paper, Typography } from '@mui/material';

export function AssetsPage() {
  // Mock data - in real implementation, this would come from props
  const assets = [
    {
      id: 1,
      name: 'Apple Inc. (AAPL)',
      type: 'Stock',
      value: '$45,230',
      change: '+2.4%',
      changePositive: true,
    },
    {
      id: 2,
      name: 'Vanguard Total Stock Market ETF',
      type: 'ETF',
      value: '$32,100',
      change: '+1.8%',
      changePositive: true,
    },
    {
      id: 3,
      name: 'High-Yield Savings Account',
      type: 'Cash',
      value: '$15,500',
      change: '+0.4%',
      changePositive: true,
    },
    {
      id: 4,
      name: 'Cryptocurrency Portfolio',
      type: 'Crypto',
      value: '$8,900',
      change: '-5.2%',
      changePositive: false,
    },
  ];

  const totalValue = '$101,730';

  return (
    <Box sx={{ p: 3, pb: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Assets
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Total Value: {totalValue}
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
                  <Box>
                    <Typography variant="h6" component="div" gutterBottom>
                      {asset.name}
                    </Typography>
                    <Chip label={asset.type} size="small" variant="outlined" />
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h5" component="div">
                      {asset.value}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {asset.changePositive ? (
                        <TrendingUp color="success" fontSize="small" />
                      ) : (
                        <TrendingDown color="error" fontSize="small" />
                      )}
                      <Typography
                        variant="body2"
                        color={asset.changePositive ? 'success.main' : 'error.main'}
                        sx={{ ml: 0.5 }}
                      >
                        {asset.change}
                      </Typography>
                    </Box>
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
          <Button variant="contained" startIcon={<Add />}>
            Add Your First Asset
          </Button>
        </Paper>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add asset"
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
