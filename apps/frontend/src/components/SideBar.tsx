'use client';

import { useLogoutUserMutation } from '@/graphql/models/generated';
import { 
  ChevronLeft, 
  ChevronRight, 
  Dashboard, 
  LogoutRounded,
  AccountBalanceWalletRounded
} from '@mui/icons-material';
import { 
  Box, 
  Drawer, 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Tooltip, 
  Divider,
  Typography,
  useTheme,
  styled,
  Theme,
  CSSObject
} from '@mui/material';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { FC, JSX, useState } from 'react';

const drawerWidth = 240;
const collapsedWidth = 68;

// Styled components and helpers for cleaner code
const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  borderRight: `1px solid ${theme.palette.divider}`,
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: collapsedWidth,
  borderRight: `1px solid ${theme.palette.divider}`,
});

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  width: open ? drawerWidth : collapsedWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  ...(open && {
    ...openedMixin(theme),
    '& .MuiDrawer-paper': openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    '& .MuiDrawer-paper': closedMixin(theme),
  }),
}));

interface NavItem {
    label: string;
    href: string;
    icon: JSX.Element;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <Dashboard /> },
    { label: 'Assets', href: '/assets', icon: <AccountBalanceWalletRounded /> },
];

// Define prop types for custom components
interface NavItemProps {
    active?: boolean;
}

// Styled list item for nav items with consistent styling
const StyledNavItem = styled(ListItemButton, {
    shouldForwardProp: (prop) => prop !== 'active',
})<NavItemProps>(({ theme, active }) => ({
    minHeight: 48,
    borderRadius: 8,
    margin: theme.spacing(0.5, 1),
    padding: theme.spacing(0, 2.5),
    backgroundColor: active ? 
        theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' : 
        'transparent',
    '&:hover': {
        backgroundColor: active ? 
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' : 
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    },
    position: 'relative',
}));

const NavItem: FC<{ item: NavItem; isCollapsed: boolean }> = ({ item, isCollapsed }) => {
    const pathname = usePathname();
    const theme = useTheme();
    const isActive = pathname === item.href;
    
    return (
        <Tooltip title={isCollapsed ? item.label : ""} placement="right" arrow>
            <Link href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                <StyledNavItem
                    active={isActive}
                    sx={{
                        justifyContent: isCollapsed ? 'center' : 'initial',
                    }}
                >
                    <ListItemIcon 
                        sx={{ 
                            minWidth: 0, 
                            mr: isCollapsed ? 'auto' : 3, 
                            justifyContent: 'center', 
                            color: isActive ? theme.palette.primary.main : 'inherit'
                        }}
                    >
                        {item.icon}
                    </ListItemIcon>
                    {!isCollapsed && (
                        <ListItemText 
                            primary={item.label} 
                            sx={{ 
                                color: isActive ? theme.palette.primary.main : 'inherit',
                                fontWeight: isActive ? 500 : 400
                            }} 
                        />
                    )}
                    {isActive && (
                        <Box 
                            sx={{ 
                                width: 3, 
                                height: 36, 
                                backgroundColor: theme.palette.primary.main,
                                position: 'absolute',
                                right: 0,
                                borderRadius: '4px 0 0 4px'
                            }} 
                        />
                    )}
                </StyledNavItem>
            </Link>
        </Tooltip>
    );
};

const Sidebar: FC = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const router = useRouter();
    const theme = useTheme();
    const [logout] = useLogoutUserMutation();

    const handleLogout = () => {
        logout()
            .then(() => {
                router.push('/login');
            });
    };

    // Action buttons for the bottom section
    const actionItems = [
        {
            label: isCollapsed ? "Expand" : "Collapse",
            icon: isCollapsed ? <ChevronRight /> : <ChevronLeft />,
            onClick: () => setIsCollapsed(!isCollapsed),
        },
        {
            label: "Logout",
            icon: <LogoutRounded />,
            onClick: handleLogout,
        }
    ];

    return (
        <StyledDrawer variant="permanent" open={!isCollapsed}>
            {/* Logo Section */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    padding: theme.spacing(2),
                    paddingLeft: isCollapsed ? theme.spacing(2) : theme.spacing(3),
                    minHeight: 64,
                }}
            >
                <Typography 
                    variant="h6" 
                    noWrap 
                    component="div" 
                    sx={{ fontWeight: isCollapsed ? 700 : 600 }}
                >
                    {!isCollapsed ? 'WealthAtlas' : 'WA'}
                </Typography>
            </Box>

            <Divider />

            {/* Nav Items */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', my: 1 }}>
                <List component="nav" disablePadding>
                    {navItems.map((item) => (
                        <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />
                    ))}
                </List>
            </Box>

            <Divider sx={{ mt: 'auto' }} />

            {/* Bottom Actions */}
            <Box sx={{ p: 1 }}>
                {actionItems.map((item) => (
                    <Tooltip key={item.label} title={isCollapsed ? item.label : ""} placement="right" arrow>
                        <StyledNavItem
                            onClick={item.onClick}
                            sx={{
                                justifyContent: isCollapsed ? 'center' : 'initial',
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: 0,
                                    mr: isCollapsed ? 'auto' : 3,
                                    justifyContent: 'center',
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            {!isCollapsed && <ListItemText primary={item.label} />}
                        </StyledNavItem>
                    </Tooltip>
                ))}
            </Box>
        </StyledDrawer>
    );
};

export default Sidebar;