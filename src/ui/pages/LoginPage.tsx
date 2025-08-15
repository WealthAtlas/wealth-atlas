import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';

interface LoginPageProps {
  onLogin: (username: string) => Promise<void>;
  isLoading: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isLoading }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onLogin(username.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ my: 8, textAlign: 'center' }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom textAlign="center">
            Wealth Atlas
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
            Local-first wealth management
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              autoFocus
              disabled={isSubmitting}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting || !username.trim()}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
            📱 Your data stays on this device only
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};
