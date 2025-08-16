import {
  AccountBalance,
  Add,
  CurrencyBitcoin,
  DirectionsCar,
  Home,
  School,
  TrendingUp,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Fab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';

export function AssetTypesPage() {
  const assetTypes = [
    {
      name: 'Stocks',
      description: 'Individual company shares and equity investments',
      icon: <TrendingUp />,
      count: 15,
      color: 'primary' as const,
    },
    {
      name: 'ETFs',
      description: 'Exchange-traded funds and index investments',
      icon: <AccountBalance />,
      count: 8,
      color: 'secondary' as const,
    },
    {
      name: 'Real Estate',
      description: 'Property investments and REITs',
      icon: <Home />,
      count: 3,
      color: 'success' as const,
    },
    {
      name: 'Vehicles',
      description: 'Cars, motorcycles, and other vehicles',
      icon: <DirectionsCar />,
      count: 2,
      color: 'warning' as const,
    },
    {
      name: 'Education',
      description: 'Education savings and 529 plans',
      icon: <School />,
      count: 1,
      color: 'info' as const,
    },
    {
      name: 'Cryptocurrency',
      description: 'Digital currencies and crypto investments',
      icon: <CurrencyBitcoin />,
      count: 5,
      color: 'error' as const,
    },
  ];

  return (
    <Box sx={{ p: 3, pb: 10 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Asset Types
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage and configure the types of assets you can track in your portfolio.
      </Typography>

      <Paper elevation={2}>
        <List>
          {assetTypes.map((assetType, index) => (
            <ListItem key={index} button>
              <ListItemIcon>{assetType.icon}</ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight="medium">
                      {assetType.name}
                    </Typography>
                    <Chip
                      label={`${assetType.count} assets`}
                      size="small"
                      color={assetType.color}
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={assetType.description}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button variant="outlined" size="large">
          Import Asset Types
        </Button>
      </Box>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add asset type"
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
