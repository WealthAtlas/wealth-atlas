import { Assessment } from '@mui/icons-material';
import { Box, Button, Paper, Typography } from '@mui/material';

export function HomePage() {
  return (
    <Box sx={{ p: 3, textAlign: 'center', mt: 8 }}>
      <Assessment sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
      <Typography variant="h3" component="h1" gutterBottom>
        Welcome to Wealth Atlas
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
        Your comprehensive solution for managing investments, tracking assets, and building wealth.
      </Typography>

      <Paper elevation={2} sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Get started by exploring your dashboard or adding your first assets to begin tracking your
          financial journey.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="contained" size="large">
            View Dashboard
          </Button>
          <Button variant="outlined" size="large">
            Add Assets
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
