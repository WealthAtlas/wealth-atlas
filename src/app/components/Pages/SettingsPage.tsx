import { Palette } from '@mui/icons-material';
import { Box, List, ListItem, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material';

export function SettingsPage() {
  const settingsOptions = [
    {
      title: 'Home Currency',
      description: 'Set your home currency',
      icon: <Palette />,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configure your application preferences and account settings.
      </Typography>

      <Paper elevation={2}>
        <List>
          {settingsOptions.map((option, index) => (
            <ListItem key={index} button>
              <ListItemIcon>{option.icon}</ListItemIcon>
              <ListItemText primary={option.title} secondary={option.description} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
