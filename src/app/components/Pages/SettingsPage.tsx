import { Notifications, Palette, Security, Storage } from '@mui/icons-material';
import { Box, List, ListItem, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material';

export function SettingsPage() {
  const settingsOptions = [
    {
      title: 'Appearance',
      description: 'Theme, colors, and display preferences',
      icon: <Palette />,
    },
    {
      title: 'Security',
      description: 'Password, privacy, and data protection',
      icon: <Security />,
    },
    {
      title: 'Notifications',
      description: 'Alerts, reminders, and communication preferences',
      icon: <Notifications />,
    },
    {
      title: 'Data Management',
      description: 'Import, export, and backup options',
      icon: <Storage />,
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
