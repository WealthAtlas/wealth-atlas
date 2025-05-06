'use client';

import { Drawer, List, ListItemButton, ListItemText, ListItemIcon, Box } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useState } from 'react';
import { Menu, Home, Settings } from '@mui/icons-material';

const drawerWidth = 240;

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const router = useRouter();
    const navItems = [
        { label: 'Home', href: '/', icon: <Home /> },
        { label: 'Dashboard', href: '/dashboard', icon: <Menu /> },
        { label: 'Settings', href: '/settings', icon: <Settings /> },
    ];

    const handleLogout = () => {
        Cookies.remove('token');
        router.push('/login');
    };

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: isCollapsed ? 60 : drawerWidth,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                [`& .MuiDrawer-paper`]: {
                    width: isCollapsed ? 60 : drawerWidth,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}>
            <Box>
                <List>
                    <ListItemButton onClick={() => setIsCollapsed(!isCollapsed)}>
                        <ListItemIcon>
                            <Menu />
                        </ListItemIcon>
                        {!isCollapsed && <ListItemText primary="Collapse" />}
                    </ListItemButton>
                    {navItems.map(({ label, href, icon }) => (
                        <Link key={href} href={href} passHref legacyBehavior>
                            <ListItemButton component="a">
                                <ListItemIcon>{icon}</ListItemIcon>
                                {!isCollapsed && <ListItemText primary={label} />}
                            </ListItemButton>
                        </Link>
                    ))}
                </List>
            </Box>
            <Box>
                <ListItemButton onClick={handleLogout} sx={{ marginTop: 'auto' }}>
                    <ListItemIcon>
                        <Menu />
                    </ListItemIcon>
                    {!isCollapsed && <ListItemText primary="Logout" />}
                </ListItemButton>
            </Box>
        </Drawer>
    );
};

export default Sidebar;