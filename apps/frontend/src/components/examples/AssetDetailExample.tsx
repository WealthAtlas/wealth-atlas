import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, Divider, Grid, Paper } from '@mui/material';
import DynamicAssetValue from '@/components/DynamicAssetValue';

// This is an example component to show how to use the DynamicAssetValue component
// You would integrate this with your actual asset detail page

interface AssetDetailPageProps {
  asset: {
    id: string;
    name: string;
    description: string;
    category: string;
    riskLevel: string;
    valueStrategy: {
      __typename: string;
      type: string;
      scriptCode?: string;
    };
  };
}

const AssetDetailExample: React.FC<AssetDetailPageProps> = ({ asset }) => {
  const [currentValue, setCurrentValue] = useState<number | null>(null);

  // Handler for when the dynamic value is calculated
  const handleValueCalculated = (value: number) => {
    console.log('New asset value calculated:', value);
    setCurrentValue(value);
    
    // In a real application, you might want to save this value to the backend
    // or update it in a global state
  };

  return (
    <Paper sx={{ p: 3, maxWidth: '800px', margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        {asset.name}
      </Typography>
      
      <Typography variant="body1" paragraph>
        {asset.description}
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Asset Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Category:</Typography>
                <Typography variant="body2">{asset.category}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Risk Level:</Typography>
                <Typography variant="body2">{asset.riskLevel}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Value Strategy:</Typography>
                <Typography variant="body2">{asset.valueStrategy.type}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Current Value
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {asset.valueStrategy.__typename === 'DynamicValueStrategy' && asset.valueStrategy.scriptCode ? (
                <DynamicAssetValue 
                  scriptCode={asset.valueStrategy.scriptCode}
                  onValueCalculated={handleValueCalculated}
                  autoRefresh={true}
                  refreshInterval={300000} // 5 minutes
                />
              ) : (
                <Typography>
                  {currentValue !== null 
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(currentValue) 
                    : 'No dynamic value available'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default AssetDetailExample;
