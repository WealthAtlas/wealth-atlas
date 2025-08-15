import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Typography, Box, Paper } from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm">
        <Box sx={{ my: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom>
              Wealth Atlas
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Minimal React PWA with Material-UI
            </Typography>
          </Paper>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;
