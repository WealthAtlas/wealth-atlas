import { AccountBalance, Assessment, Receipt, TrendingUp } from '@mui/icons-material';
import { Box, Card, CardContent, Grid, Paper, Typography } from '@mui/material';

export function DashboardPage() {
  // Mock data - in real implementation, this would come from props
  const stats = [
    {
      title: 'Total Assets',
      value: '$125,430',
      icon: <AccountBalance color="primary" />,
      change: '+5.2%',
    },
    {
      title: 'Portfolio Growth',
      value: '$8,540',
      icon: <TrendingUp color="success" />,
      change: '+12.4%',
    },
    {
      title: 'Active Loans',
      value: '$45,200',
      icon: <Assessment color="warning" />,
      change: '-2.1%',
    },
    {
      title: 'Monthly Expenses',
      value: '$3,280',
      icon: <Receipt color="error" />,
      change: '+1.8%',
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back! Here&apos;s an overview of your financial portfolio.
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {stat.icon}
                  <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                    {stat.title}
                  </Typography>
                </Box>
                <Typography variant="h4" component="div" gutterBottom>
                  {stat.value}
                </Typography>
                <Typography
                  variant="body2"
                  color={stat.change.startsWith('+') ? 'success.main' : 'error.main'}
                >
                  {stat.change} from last month
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Recent Activity
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your recent transactions and portfolio changes will appear here.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
