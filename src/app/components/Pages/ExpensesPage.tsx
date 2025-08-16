import {
  Add,
  HealthAndSafety,
  Home,
  LocalGasStation,
  Restaurant,
  ShoppingCart,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Fab,
  Grid,
  Paper,
  Typography,
} from '@mui/material';

export function ExpensesPage() {
  // Mock data - in real implementation, this would come from props
  const expenses = [
    {
      id: 1,
      category: 'Groceries',
      amount: '$125.50',
      date: '2024-08-15',
      description: 'Weekly grocery shopping',
      icon: <ShoppingCart />,
      color: '#4caf50',
    },
    {
      id: 2,
      category: 'Gas',
      amount: '$68.20',
      date: '2024-08-14',
      description: 'Fuel for commute',
      icon: <LocalGasStation />,
      color: '#ff9800',
    },
    {
      id: 3,
      category: 'Dining',
      amount: '$45.75',
      date: '2024-08-13',
      description: 'Dinner with friends',
      icon: <Restaurant />,
      color: '#f44336',
    },
    {
      id: 4,
      category: 'Utilities',
      amount: '$180.00',
      date: '2024-08-12',
      description: 'Monthly electricity bill',
      icon: <Home />,
      color: '#2196f3',
    },
    {
      id: 5,
      category: 'Healthcare',
      amount: '$95.30',
      date: '2024-08-11',
      description: 'Doctor visit copay',
      icon: <HealthAndSafety />,
      color: '#9c27b0',
    },
  ];

  const monthlyBudget = '$3,500';
  const totalSpent = '$2,284.75';
  const remaining = '$1,215.25';

  const categories = [
    { name: 'Groceries', budget: '$400', spent: '$320', color: '#4caf50' },
    { name: 'Dining', budget: '$200', spent: '$156', color: '#f44336' },
    { name: 'Transportation', budget: '$300', spent: '$268', color: '#ff9800' },
    { name: 'Utilities', budget: '$250', spent: '$180', color: '#2196f3' },
    { name: 'Entertainment', budget: '$150', spent: '$89', color: '#e91e63' },
    { name: 'Healthcare', budget: '$200', spent: '$95', color: '#9c27b0' },
  ];

  return (
    <Box sx={{ p: 3, pb: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Expenses
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Monthly Budget: {monthlyBudget}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Spent: {totalSpent} • Remaining: {remaining}
          </Typography>
        </Box>
      </Box>

      {/* Budget Overview */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Budget by Category
        </Typography>
        <Grid container spacing={2}>
          {categories.map((category, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                <Avatar sx={{ bgcolor: category.color, mr: 2, width: 24, height: 24 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: 'white', borderRadius: '50%' }} />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    {category.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {category.spent} of {category.budget}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Recent Expenses */}
      <Typography variant="h6" gutterBottom>
        Recent Expenses
      </Typography>
      <Grid container spacing={2}>
        {expenses.map(expense => (
          <Grid item xs={12} key={expense.id}>
            <Card elevation={1}>
              <CardContent sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: expense.color, mr: 2 }}>{expense.icon}</Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}
                    >
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {expense.description}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip label={expense.category} size="small" variant="outlined" />
                          <Typography variant="caption" color="text.secondary">
                            {expense.date}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="h6" fontWeight="medium">
                        {expense.amount}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {expenses.length === 0 && (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            No expenses found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Start tracking your expenses to better manage your budget.
          </Typography>
          <Button variant="contained" startIcon={<Add />}>
            Add Your First Expense
          </Button>
        </Paper>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add expense"
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
