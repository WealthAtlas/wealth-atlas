import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { LogoutOutlined } from '@mui/icons-material';
import { User, DashboardData } from '../../domain/types';

interface DashboardPageProps {
  user: User;
  dashboardData: DashboardData | null;
  isLoading: boolean;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  dashboardData,
  isLoading,
  onLogout,
}) => {
  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <Typography>Loading dashboard...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        {/* Header */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" component="h1">
                Welcome back, {user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your wealth overview
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<LogoutOutlined />}
              onClick={onLogout}
            >
              Logout
            </Button>
          </Box>
        </Paper>

        {/* Dashboard Cards */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total Value
                </Typography>
                <Typography variant="h4" color="primary">
                  ${dashboardData?.totalValue?.toLocaleString() || '0'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly Change
                </Typography>
                <Typography 
                  variant="h4" 
                  color={dashboardData?.monthlyChange >= 0 ? 'success.main' : 'error.main'}
                >
                  {dashboardData?.monthlyChange >= 0 ? '+' : ''}
                  {dashboardData?.monthlyChange?.toFixed(1) || '0'}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Portfolio Items
                </Typography>
                <Typography variant="h4" color="primary">
                  {dashboardData?.portfolioItems || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="contained">Add Investment</Button>
                  <Button variant="outlined">View Portfolio</Button>
                  <Button variant="outlined">Import Data</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {dashboardData?.lastUpdated?.toLocaleString() || 'Never'}
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};
