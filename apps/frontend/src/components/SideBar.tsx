'use client';

import { useLogoutUserMutation } from '@/graphql/models/generated';
import { 
  ChevronLeft, 
  ChevronRight, 
  Dashboard, 
  Money, 
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
  useTheme
} from '@mui/material';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { FC, JSX, useState } from 'react';


const drawerWidth = 240;
const collapsedWidth = 68;

interface NavItem {
    label: string;
    href: string;
    icon: JSX.Element;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <Dashboard /> },
    { label: 'Assets', href: '/assets', icon: <AccountBalanceWalletRounded /> },
];

const NavItem: FC<{ item: NavItem; isCollapsed: boolean }> = ({ item, isCollapsed }) => {
    const pathname = usePathname();
    const theme = useTheme();
    const isActive = pathname === item.href;
    
    return (
        <Tooltip title={isCollapsed ? item.label : ""} placement="right" arrow>
            <Link href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                <ListItemButton 
                    sx={{
                        minHeight: 48,
                        justifyContent: isCollapsed ? 'center' : 'initial',
                        px: 2.5,
                        borderRadius: '8px',
                        mx: 1,
                        my: 0.5,
                        backgroundColor: isActive ? 
                            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' : 
                            'transparent',
                        '&:hover': {
                            backgroundColor: isActive ? 
                                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' : 
                                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        }
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
                                opacity: 1,
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
                </ListItemButton>
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

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: isCollapsed ? collapsedWidth : drawerWidth,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: {
                    width: isCollapsed ? collapsedWidth : drawerWidth,
                    boxSizing: 'border-box',
                    borderRight: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.paper,
                    overflowX: 'hidden',
                    transition: theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                },
            }}
        >
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
                {!isCollapsed ? (
                    <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
                        WealthAtlas
                    </Typography>
                ) : (
                    <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
                        WA
                    </Typography>
                )}
            </Box>

            <Divider />

            {/* Nav Items */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', my: 1 }}>
                <List component="nav" disablePadding>
                    {navItems.map((item) => (
                        <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />
                    ))}
                </List>
            </Box>

            <Divider sx={{ mt: 'auto' }} />

            {/* Bottom Actions */}
            <Box sx={{ p: 1 }}>
                {/* Collapse/Expand Button */}
                <Tooltip title={isCollapsed ? "Expand" : "Collapse"} placement="right" arrow>
                    <ListItemButton
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        sx={{
                            minHeight: 48,
                            justifyContent: isCollapsed ? 'center' : 'initial',
                            px: 2.5,
                            borderRadius: '8px',
                            mx: 1,
                            my: 0.5,
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: 0,
                                mr: isCollapsed ? 'auto' : 3,
                                justifyContent: 'center',
                            }}
                        >
                            {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
                        </ListItemIcon>
                        {!isCollapsed && <ListItemText primary="Collapse" />}
                    </ListItemButton>
                </Tooltip>

                {/* Logout Button */}
                <Tooltip title={isCollapsed ? "Logout" : ""} placement="right" arrow>
                    <ListItemButton
                        onClick={handleLogout}
                        sx={{
                            minHeight: 48,
                            justifyContent: isCollapsed ? 'center' : 'initial',
                            px: 2.5,
                            borderRadius: '8px',
                            mx: 1,
                            my: 0.5,
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: 0,
                                mr: isCollapsed ? 'auto' : 3,
                                justifyContent: 'center',
                            }}
                        >
                            <LogoutRounded />
                        </ListItemIcon>
                        {!isCollapsed && <ListItemText primary="Logout" />}
                    </ListItemButton>
                </Tooltip>
            </Box>
        </Drawer>
    );
};

export default Sidebar;