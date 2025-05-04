'use client';

import { Drawer, List, ListItemButton, ListItemText } from '@mui/material';
import Link from 'next/link';

const drawerWidth = 240;

const Sidebar = () => {
    const navItems = [
        { label: 'Home', href: '/' },
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Settings', href: '/settings' },
    ];

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
            }}>
            <List>
                {
                    navItems.map(({ label, href }) => (
                        <Link key={href} href={href} passHref legacyBehavior >
                            <ListItemButton component="a" >
                                <ListItemText primary={label} />
                            </ListItemButton>
                        </Link>
                    ))
                }
            </List>
        </Drawer>
    );
};

export default Sidebar;