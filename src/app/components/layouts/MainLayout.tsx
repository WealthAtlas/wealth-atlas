import {
  AccountBalance,
  Assessment,
  AutoAwesome,
  CreditCard,
  Dashboard,
  MoreVert,
  Receipt,
  TrendingUp,
} from '@mui/icons-material';
import {
  AppBar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Fab,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
  currentTab: number;
  onTabChange: (newValue: number) => void;
  anchorEl: HTMLElement | null;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onMenuClose: () => void;
  onSettingsClick: () => void;
  onJournalClick: () => void;
  onImportClick: () => void;
  onAssistantClick: () => void;
  /**
   * Whether the tab on show has its own primary FAB. Assets, Expenses, Loans
   * and Goals each have an "add" FAB in the bottom-right corner, so the
   * assistant sits one slot above it there and takes the corner on the
   * Dashboard, which has none.
   */
  hasPageFab: boolean;
}

export function MainLayout({
  children,
  currentTab,
  onTabChange,
  anchorEl,
  onMenuOpen,
  onMenuClose,
  onSettingsClick,
  onJournalClick,
  onImportClick,
  onAssistantClick,
  hasPageFab,
}: MainLayoutProps) {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.up('md'));

  const navigationItems = [
    { label: 'Dashboard', icon: <Dashboard />, value: 0 },
    { label: 'Assets', icon: <AccountBalance />, value: 1 },
    { label: 'Expenses', icon: <Receipt />, value: 2 },
    { label: 'Loans', icon: <CreditCard />, value: 3 },
    { label: 'Goals', icon: <TrendingUp />, value: 4 },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Assessment sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Wealth Atlas
          </Typography>
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            aria-label="more options"
            aria-controls="app-menu"
            aria-haspopup="true"
            onClick={onMenuOpen}
          >
            <MoreVert />
          </IconButton>
          <Menu
            id="app-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={onMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={onImportClick}>Import Statement</MenuItem>
            <MenuItem onClick={onJournalClick}>Decision Journal</MenuItem>
            <MenuItem onClick={onSettingsClick}>Settings</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          pb: isTablet ? 0 : 7, // Add padding bottom on mobile for bottom nav
        }}
      >
        {children}
      </Box>

      {/*
        Extended rather than circular, and labelled: the pages it floats over
        already have a circular primary FAB, and a second round button would
        read as another "add" rather than as the assistant.
      */}
      <Fab
        variant="extended"
        color="primary"
        aria-label="Ask the assistant"
        onClick={onAssistantClick}
        sx={{
          position: 'fixed',
          bottom: hasPageFab ? 148 : 80,
          right: 16,
        }}
      >
        <AutoAwesome sx={{ mr: 1 }} />
        Ask
      </Fab>

      {/* Bottom Navigation for Mobile/Tablet */}
      <BottomNavigation
        value={currentTab}
        onChange={(_, newValue) => onTabChange(newValue)}
        showLabels
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        {navigationItems.map(item => (
          <BottomNavigationAction
            key={item.value}
            label={item.label}
            icon={item.icon}
            value={item.value}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}
